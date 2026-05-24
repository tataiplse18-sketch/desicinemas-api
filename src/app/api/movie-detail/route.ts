import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');
  
  if (!slug) {
    return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
  }

  try {
    const url = `https://desicinemas.pk/movies/${slug}/`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const html = await response.text();
    
    // Extract movie details
    const title = extractBetween(html, /<h1\s+class="Title">([\s\S]*?)<\/h1>/i) || '';
    const description = extractBetween(html, /class="Description"><p>([\s\S]*?)<\/p>/i) || '';
    const quality = extractBetween(html, /class="Qlty">([\s\S]*?)<\/span>/i) || '';
    const duration = extractBetween(html, /class="Time">([\s\S]*?)<\/span>/i) || '';
    const year = extractBetween(html, /class="Date">([\s\S]*?)<\/span>/i) || '';
    
    // Extract genres
    const genreRegex = /class="Genre">[\s\S]*?<\/span>([\s\S]*?)<\/p>/gi;
    const genreMatch = genreRegex.exec(html);
    let genres: string[] = [];
    if (genreMatch) {
      const genreLinks = genreMatch[1].match(/>([^<]+)<\/a>/g) || [];
      genres = genreLinks.map((g: string) => g.replace(/<\/?a[^>]*>/g, '').replace(/>/g, ''));
    }
    
    // Extract cast
    const castRegex = /class="Cast[\s\S]*?<\/span>([\s\S]*?)<\/p>/gi;
    const castMatch = castRegex.exec(html);
    let cast: string[] = [];
    if (castMatch) {
      const castLinks = castMatch[1].match(/>([^<]+)<\/a>/g) || [];
      cast = castLinks.map((c: string) => c.replace(/<\/?a[^>]*>/g, '').replace(/>/g, ''));
    }
    
    // Extract directors
    const directorRegex = /class="Director[\s\S]*?<\/span>([\s\S]*?)<\/p>/gi;
    const directorMatch = directorRegex.exec(html);
    let directors: string[] = [];
    if (directorMatch) {
      const dirLinks = directorMatch[1].match(/>([^<]+)<\/a>/g) || [];
      directors = dirLinks.map((d: string) => d.replace(/<\/?a[^>]*>/g, '').replace(/>/g, ''));
    }
    
    // Extract thumbnail/background image
    const thumbMatch = html.match(/data-src="(\/\/image\.tmdb\.org\/[^"]+)"/i);
    const thumbnail = thumbMatch ? `https:${thumbMatch[1]}` : '';
    
    // Extract video embed info
    const embedRegex = /data-typ="movie"\s+data-key="(\d+)"\s+data-id="(\d+)"/gi;
    let embeds: { key: string; id: string; label: string; server: string; quality: string; }[] = [];
    let embedMatch;
    while ((embedMatch = embedRegex.exec(html)) !== null) {
      embeds.push({
        key: embedMatch[1],
        id: embedMatch[2],
        label: `Option ${parseInt(embedMatch[1]) + 1}`,
        server: '',
        quality: ''
      });
    }
    
    // Also try to extract embed server info
    const optionRegex = /data-key="(\d+)"\s+data-id="(\d+)"[\s\S]*?class="AAIco-language">([\s\S]*?)<\/p>[\s\S]*?class="AAIco-dns">([\s\S]*?)<\/p>[\s\S]*?class="AAIco-equalizer">([\s\S]*?)<\/p>/gi;
    embeds = [];
    while ((embedMatch = optionRegex.exec(html)) !== null) {
      embeds.push({
        key: embedMatch[1],
        id: embedMatch[2],
        label: `Option ${parseInt(embedMatch[1]) + 1}`,
        server: embedMatch[3].trim(),
        quality: embedMatch[4].trim()
      });
    }
    
    // Extract likes
    const likesMatch = html.match(/class="vot_cl">(\d+)/);
    const dislikesMatch = html.match(/class="vot_cu">(\d+)/);
    
    return NextResponse.json({
      success: true,
      movie: {
        title: title.replace(/<[^>]*>/g, '').trim(),
        slug,
        url,
        description: description.replace(/<[^>]*>/g, '').trim(),
        year,
        quality,
        duration,
        genres,
        cast,
        directors,
        thumbnail,
        embeds,
        likes: likesMatch ? parseInt(likesMatch[1]) : 0,
        dislikes: dislikesMatch ? parseInt(dislikesMatch[1]) : 0
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function extractBetween(html: string, regex: RegExp): string | null {
  const match = regex.exec(html);
  return match ? match[1] : null;
}
