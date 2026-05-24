import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://desicinemas.pk';

interface LatestMovie {
  title: string;
  slug: string;
  url: string;
  year: string;
  quality: string;
  duration: string;
  thumbnail: string;
  genres: string[];
  addedDate: string;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });
  return await res.text();
}

export async function GET() {
  try {
    const html = await fetchPage(BASE_URL);
    const $ = cheerio.load(html);
    const movies: LatestMovie[] = [];

    // Extract latest movies from homepage
    $('.TPostMv, .TPost.B').each((_, el) => {
      const $el = $(el);
      const title = $el.find('.Title').first().text().trim();
      const linkEl = $el.find('a').first();
      const url = linkEl.attr('href') || '';
      const slug = url.split('/movies/')[1]?.replace(/\/$/, '') || url.split('/series/')[1]?.replace(/\/$/, '') || '';
      
      if (!title || !slug) return;

      const quality = $el.find('.Qlty').first().text().trim();
      const duration = $el.find('.Time').first().text().trim();
      const year = $el.find('.Date').first().text().trim();

      let thumbnail = '';
      const allImgs = $el.find('img');
      allImgs.each((_, img) => {
        const dataSrc = $(img).attr('data-src') || $(img).attr('data-litespeed-src') || '';
        const src = $(img).attr('src') || '';
        const candidate = dataSrc || src;
        if (candidate && (candidate.includes('tmdb.org') || candidate.includes('image.tmdb'))) {
          thumbnail = candidate.startsWith('//') ? `https:${candidate}` : candidate;
          return false;
        }
      });
      if (!thumbnail) {
        allImgs.each((_, img) => {
          const dataSrc = $(img).attr('data-src') || $(img).attr('data-litespeed-src') || '';
          const src = $(img).attr('src') || '';
          const candidate = dataSrc || src;
          if (candidate && !candidate.includes('data:image') && !candidate.includes('svg') && !candidate.includes('about:blank')) {
            thumbnail = candidate.startsWith('//') ? `https:${candidate}` : candidate;
            return false;
          }
        });
      }

      const genres: string[] = [];
      $el.find('.Genre a').each((_, g) => {
        genres.push($(g).text().trim());
      });

      movies.push({
        title,
        slug,
        url,
        year,
        quality,
        duration,
        thumbnail,
        genres,
        addedDate: new Date().toISOString(),
      });
    });

    return NextResponse.json({
      success: true,
      movies,
      total: movies.length,
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 300000).toISOString(), // 5 minutes
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
