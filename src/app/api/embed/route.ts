import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const trembed = searchParams.get('trembed') || '0';
  const trid = searchParams.get('trid') || '';
  const trtype = searchParams.get('trtype') || '1';
  
  if (!trid) {
    return NextResponse.json({ success: false, error: 'trid is required' }, { status: 400 });
  }

  try {
    // Construct the embed URL that desicinemas uses
    const embedUrl = `https://desicinemas.pk/?trembed=${trembed}&trid=${trid}&trtype=${trtype}`;
    
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://desicinemas.pk/',
      },
      redirect: 'follow',
    });

    const html = await response.text();
    
    // Try to find the actual video source URL from the iframe/embed
    const iframeMatch = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/i);
    const videoSrcMatch = html.match(/src="([^"]*(?:player|embed|stream|video)[^"]*)"/i);
    const sourceMatch = html.match(/<source[^>]*src="([^"]+)"[^>]*>/i);
    
    let videoUrl = '';
    if (iframeMatch) {
      videoUrl = iframeMatch[1];
    } else if (videoSrcMatch) {
      videoUrl = videoSrcMatch[1];
    } else if (sourceMatch) {
      videoUrl = sourceMatch[1];
    }
    
    return NextResponse.json({
      success: true,
      embedUrl,
      videoUrl,
      finalUrl: response.url,
      html: html.substring(0, 5000) // Send partial HTML for analysis
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
