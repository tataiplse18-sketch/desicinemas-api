import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get('page') || '1';
  const category = searchParams.get('category') || '';
  
  try {
    let url = `https://desicinemas.pk/bmovies/page/${page}/`;
    if (category) {
      url = `https://desicinemas.pk/${category}/page/${page}/`;
    }
    if (page === '1' && !category) {
      url = 'https://desicinemas.pk/';
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const html = await response.text();
    
    // Extract movie data from HTML
    const movies = extractMovies(html);
    
    return NextResponse.json({ 
      success: true, 
      movies,
      page: parseInt(page),
      source: url
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

interface Movie {
  title: string;
  slug: string;
  url: string;
  year: string;
  quality: string;
  duration: string;
  description: string;
  thumbnail: string;
  genre: string[];
}

function extractMovies(html: string): Movie[] {
  const movies: Movie[] = [];
  
  // Match TPost.B pattern for movie cards
  const movieRegex = /class="TPost\s+B[^"]*">[\s\S]*?<a\s+href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*data-src="([^"]+)"[^>]*>[\s\S]*?<a[^>]*class="Title[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span\s+class="Qlty">([\s\S]*?)<\/span>[\s\S]*?<span\s+class="Time">([\s\S]*?)<\/span>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
  
  let match;
  while ((match = movieRegex.exec(html)) !== null) {
    const url = match[1];
    const thumbnail = match[2];
    const title = match[3].replace(/<[^>]*>/g, '').trim();
    const quality = match[4].trim();
    const duration = match[5].trim();
    const description = match[6].replace(/<[^>]*>/g, '').trim().substring(0, 200);
    
    const slug = url.split('/movies/')[1]?.replace(/\/$/, '') || '';
    
    // Extract year
    const yearMatch = html.substring(match.index, match.index + 1000).match(/<span\s+class="Date">(\d{4})<\/span>/);
    const year = yearMatch ? yearMatch[1] : '';
    
    movies.push({ title, slug, url, year, quality, duration, description, thumbnail, genre: [] });
  }
  
  // If the regex above didn't work, try alternative extraction
  if (movies.length === 0) {
    // Try slider/carousel movies
    const sliderRegex = /class="TPostMv">[\s\S]*?<a\s+href="(https:\/\/desicinemas\.pk\/movies\/[^"]+)">[\s\S]*?<div\s+class="Title">([\s\S]*?)<\/div>[\s\S]*?<span\s+class="Qlty">([\s\S]*?)<\/span>[\s\S]*?<span\s+class="Time">([\s\S]*?)<\/span>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?data-src="([^"]+image\.tmdb\.org[^"]*)"/gi;
    
    while ((match = sliderRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      const quality = match[3].trim();
      const duration = match[4].trim();
      const description = match[5].replace(/<[^>]*>/g, '').trim().substring(0, 200);
      const thumbnail = match[6];
      const slug = url.split('/movies/')[1]?.replace(/\/$/, '') || '';
      const yearMatch = html.substring(match.index, match.index + 500).match(/<span\s+class="Date">(\d{4})<\/span>/);
      
      movies.push({ 
        title, slug, url, 
        year: yearMatch ? yearMatch[1] : '', 
        quality, duration, description, thumbnail, genre: [] 
      });
    }
  }
  
  return movies;
}
