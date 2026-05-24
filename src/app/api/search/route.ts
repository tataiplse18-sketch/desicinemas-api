import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  
  if (!query) {
    return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
  }

  try {
    const url = `https://desicinemas.pk/?s=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const html = await response.text();
    
    // Extract search results
    const movies: {
      title: string;
      slug: string;
      url: string;
      year: string;
      quality: string;
      duration: string;
      description: string;
      thumbnail: string;
    }[] = [];
    
    // Pattern for search result movie cards
    const movieRegex = /class="TPost\s+B[^"]*">[\s\S]*?<a\s+href="(https:\/\/desicinemas\.pk\/movies\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*(?:data-src|src)="([^"]+)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?<span\s+class="Qlty">([^<]+)<\/span>[\s\S]*?<span\s+class="Time">([^<]+)<\/span>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
    
    let match;
    while ((match = movieRegex.exec(html)) !== null) {
      const movieUrl = match[1];
      const thumbnail = match[2];
      const title = match[3].trim();
      const quality = match[4].trim();
      const duration = match[5].trim();
      const description = match[6].replace(/<[^>]*>/g, '').trim().substring(0, 200);
      const slug = movieUrl.split('/movies/')[1]?.replace(/\/$/, '') || '';
      
      const yearMatch = html.substring(match.index, match.index + 500).match(/class="Date">(\d{4})<\/span>/);
      
      movies.push({
        title,
        slug,
        url: movieUrl,
        year: yearMatch ? yearMatch[1] : '',
        quality,
        duration,
        description,
        thumbnail
      });
    }
    
    return NextResponse.json({ success: true, movies, query });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
