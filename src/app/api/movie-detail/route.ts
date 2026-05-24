import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://desicinemas.pk';

interface EmbedInfo {
  key: string;
  id: string;
  label: string;
  language: string;
  server: string;
  quality: string;
  embedUrl: string;
  playerUrl: string;
  videoId: string;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });
  return await res.text();
}

async function getPlayerUrl(embedUrl: string): Promise<{ playerUrl: string; videoId: string }> {
  try {
    // Fetch the embed page which contains an iframe to the actual player
    const html = await fetchPage(embedUrl);
    const $ = cheerio.load(html);
    
    // Find the iframe inside .Video div
    const iframeSrc = $('.Video iframe').attr('src') || 
                      $('iframe').attr('data-litespeed-src') || 
                      $('iframe').attr('data-src') || '';
    
    if (iframeSrc) {
      // Extract video ID from the hash
      const hashMatch = iframeSrc.match(/#([a-zA-Z0-9]+)$/);
      const videoId = hashMatch ? hashMatch[1] : '';
      return { playerUrl: iframeSrc, videoId };
    }
    
    return { playerUrl: '', videoId: '' };
  } catch {
    return { playerUrl: '', videoId: '' };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
  }

  try {
    const url = `${BASE_URL}/movies/${slug}/`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Extract movie details
    const title = $('h1.Title').first().text().trim();
    const description = $('.Description > p').first().text().trim();
    const quality = $('.Info .Qlty').first().text().trim();
    const duration = $('.Info .Time').first().text().trim();
    const year = $('.Info .Date').first().text().trim();

    // Thumbnail
    let thumbnail = '';
    const bgImg = $('img.TPostBg').first();
    const bgDataSrc = bgImg.attr('data-src') || bgImg.attr('data-litespeed-src') || '';
    if (bgDataSrc && !bgDataSrc.includes('data:image')) {
      thumbnail = bgDataSrc.startsWith('//') ? `https:${bgDataSrc}` : bgDataSrc;
    }

    // Genres
    const genres: string[] = [];
    $('p.Genre a').each((_, el) => {
      genres.push($(el).text().trim());
    });

    // Directors
    const directors: string[] = [];
    $('p.Director a, p.Director .tt-at').each((_, el) => {
      const text = $(el).text().trim();
      if (text) directors.push(text);
    });

    // Cast
    const cast: string[] = [];
    $('p.Cast a, .Cast-sh a').each((_, el) => {
      const text = $(el).text().trim();
      if (text) cast.push(text);
    });

    // Embed options - extract from ListOptions
    const embeds: EmbedInfo[] = [];
    $('ul.ListOptions li').each((_, el) => {
      const $el = $(el);
      const key = $el.attr('data-key') || '0';
      const id = $el.attr('data-id') || '';
      const language = $el.find('.AAIco-language').text().trim();
      const server = $el.find('.AAIco-dns').text().trim();
      const qualityLabel = $el.find('.AAIco-equalizer').text().trim();
      const label = $el.find('.Optntl span').text().trim() || (parseInt(key) + 1).toString();
      
      const embedUrl = `${BASE_URL}/?trembed=${key}&trid=${id}&trtype=1`;
      
      embeds.push({
        key,
        id,
        label: `Option ${label}`,
        language: language || 'Hindi',
        server: server || 'Server',
        quality: qualityLabel || 'HD',
        embedUrl,
        playerUrl: '',
        videoId: '',
      });
    });

    // Now fetch the player URL for the first embed
    if (embeds.length > 0) {
      const firstEmbed = embeds[0];
      const { playerUrl, videoId } = await getPlayerUrl(firstEmbed.embedUrl);
      firstEmbed.playerUrl = playerUrl;
      firstEmbed.videoId = videoId;
    }

    // Likes
    const likes = parseInt($('.vot_cl').first().text()) || 0;
    const dislikes = parseInt($('.vot_cu').first().text()) || 0;

    return NextResponse.json({
      success: true,
      movie: {
        title,
        slug,
        url,
        description,
        year,
        quality,
        duration,
        thumbnail,
        genres,
        directors,
        cast,
        embeds,
        likes,
        dislikes,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
