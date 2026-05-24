import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://desicinemas.pk';

interface MovieCard {
  title: string;
  slug: string;
  url: string;
  year: string;
  quality: string;
  duration: string;
  description: string;
  thumbnail: string;
  genres: string[];
}

interface MovieDetail extends MovieCard {
  directors: string[];
  cast: string[];
  embeds: {
    key: string;
    id: string;
    label: string;
    language: string;
    server: string;
    quality: string;
    embedUrl: string;
    playerUrl: string;
  }[];
  likes: number;
  dislikes: number;
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

function extractMovies(html: string): MovieCard[] {
  const $ = cheerio.load(html);
  const movies: MovieCard[] = [];

  // Try slider/carousel movies first (TPostMv)
  $('.TPostMv, .TPost.B').each((_, el) => {
    const $el = $(el);
    const titleEl = $el.find('.Title').first();
    const title = titleEl.text().trim();
    
    const linkEl = $el.find('a').first();
    const url = linkEl.attr('href') || '';
    const slug = url.split('/movies/')[1]?.replace(/\/$/, '') || '';
    
    if (!title || !slug) return;

    const quality = $el.find('.Qlty').first().text().trim();
    const duration = $el.find('.Time').first().text().trim();
    const year = $el.find('.Date').first().text().trim();
    const description = $el.find('.Description p').first().text().trim().substring(0, 300);
    
    // Get thumbnail - prioritize TMDB images
    let thumbnail = '';
    const allImgs = $el.find('img');
    allImgs.each((_, img) => {
      const dataSrc = $(img).attr('data-src') || $(img).attr('data-litespeed-src') || '';
      const src = $(img).attr('src') || '';
      const candidate = dataSrc || src;
      if (candidate && (candidate.includes('tmdb.org') || candidate.includes('image.tmdb'))) {
        thumbnail = candidate.startsWith('//') ? `https:${candidate}` : candidate;
        return false; // break
      }
    });
    // Fallback: any non-svg, non-data, non-gif image
    if (!thumbnail) {
      allImgs.each((_, img) => {
        const dataSrc = $(img).attr('data-src') || $(img).attr('data-litespeed-src') || '';
        const src = $(img).attr('src') || '';
        const candidate = dataSrc || src;
        if (candidate && !candidate.includes('data:image') && !candidate.includes('svg') && !candidate.includes('about:blank') && !candidate.includes('rating_on') && !candidate.includes('noimg')) {
          thumbnail = candidate.startsWith('//') ? `https:${candidate}` : candidate;
          return false;
        }
      });
    }

    // Get genres
    const genres: string[] = [];
    $el.find('.Genre a').each((_, g) => {
      genres.push($(g).text().trim());
    });

    movies.push({ title, slug, url, year, quality, duration, description, thumbnail, genres });
  });

  return movies;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || '';

  try {
    let url: string;
    if (category) {
      url = page > 1 ? `${BASE_URL}/${category}/page/${page}/` : `${BASE_URL}/${category}/`;
    } else {
      url = page > 1 ? `${BASE_URL}/bmovies/page/${page}/` : `${BASE_URL}/`;
    }

    const html = await fetchPage(url);
    const movies = extractMovies(html);

    return NextResponse.json({
      success: true,
      movies,
      page,
      category: category || 'all',
      source: url,
      total: movies.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
