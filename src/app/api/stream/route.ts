import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/stream - Server-side player proxy
 * 
 * This endpoint fetches the video player page from rpmplay.xyz 
 * and serves it from our own domain, bypassing sandbox/iframe restrictions.
 * 
 * Usage: /api/stream?trembed=0&trid=10026&trtype=1
 */

async function fetchEmbedPage(trembed: string, trid: string, trtype: string): Promise<{ playerUrl: string; videoId: string }> {
  const embedUrl = `https://desicinemas.pk/?trembed=${trembed}&trid=${trid}&trtype=${trtype}`;
  
  const res = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://desicinemas.pk/',
    },
  });

  const html = await res.text();
  
  // Extract iframe src from embed page
  const iframeMatch = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/i);
  if (iframeMatch && iframeMatch[1]) {
    const playerUrl = iframeMatch[1];
    const hashMatch = playerUrl.match(/#([a-zA-Z0-9]+)$/);
    const videoId = hashMatch ? hashMatch[1] : '';
    return { playerUrl, videoId };
  }

  // Try data-src or data-litespeed-src
  const dataSrcMatch = html.match(/<iframe[^>]*data-(?:src|litespeed-src)="([^"]+)"[^>]*>/i);
  if (dataSrcMatch && dataSrcMatch[1]) {
    const playerUrl = dataSrcMatch[1];
    const hashMatch = playerUrl.match(/#([a-zA-Z0-9]+)$/);
    const videoId = hashMatch ? hashMatch[1] : '';
    return { playerUrl, videoId };
  }

  return { playerUrl: '', videoId: '' };
}

async function fetchPlayerHtml(playerUrl: string): Promise<string> {
  const res = await fetch(playerUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': playerUrl,
    },
  });
  return await res.text();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const trembed = searchParams.get('trembed') || '0';
  const trid = searchParams.get('trid') || '';
  const trtype = searchParams.get('trtype') || '1';
  // Direct player URL (skip embed page fetch)
  const directUrl = searchParams.get('url') || '';

  if (!trid && !directUrl) {
    return NextResponse.json({ success: false, error: 'trid or url is required' }, { status: 400 });
  }

  try {
    let playerUrl = directUrl;
    let videoId = '';

    if (!directUrl) {
      const embedInfo = await fetchEmbedPage(trembed, trid, trtype);
      playerUrl = embedInfo.playerUrl;
      videoId = embedInfo.videoId;
    } else {
      const hashMatch = directUrl.match(/#([a-zA-Z0-9]+)$/);
      videoId = hashMatch ? hashMatch[1] : '';
    }

    if (!playerUrl) {
      return NextResponse.json({ success: false, error: 'Could not find player URL' }, { status: 404 });
    }

    // Fetch the player HTML page
    const playerHtml = await fetchPlayerHtml(playerUrl);
    
    // Extract the domain from the player URL for rewriting
    const playerDomain = new URL(playerUrl).origin;

    // Rewrite the HTML to work from our domain
    // Replace relative asset URLs with absolute URLs pointing to the player domain
    let rewrittenHtml = playerHtml
      // Fix script src attributes
      .replace(/src="\/assets\//g, `src="${playerDomain}/assets/`)
      .replace(/src="\/cdn-cgi\//g, `src="${playerDomain}/cdn-cgi/`)
      // Fix link href attributes (CSS)
      .replace(/href="\/assets\//g, `href="${playerDomain}/assets/`)
      .replace(/href="\/favicon/g, `href="${playerDomain}/favicon`)
      // Fix any other relative URLs
      .replace(/url\(\/assets\//g, `url(${playerDomain}/assets/`)
      // Remove any X-Frame-Options or frame-busting scripts
      .replace(/if\s*\(\s*top\s*!==?\s*self\s*\)[\s\S]*?(?:\}|location\.href)/gi, '// frame-bust removed')
      .replace(/if\s*\(\s*window\s*!==?\s*window\.top\s*\)[\s\S]*?(?:\}|location\.href)/gi, '// frame-bust removed');

    // Inject a script to override sandbox detection and remove ads
    const injectionScript = `
<script>
// Override sandbox detection - make the player think it's running standalone
try {
  Object.defineProperty(window, 'top', { get: () => window });
  Object.defineProperty(window, 'parent', { get: () => window });
  window.frameElement = null;
} catch(e) {}

// Remove ad iframes and elements after page load
function removeAds() {
  const adSelectors = [
    'iframe[src*="ad"]', 'iframe[src*="banner"]', 'iframe[src*="pop"]',
    '[id*="ad-"]', '[id*="ad_"]', '[class*="ad-"]', '[class*="ad_"]',
    '[id*="banner"]', '[class*="banner"]', 'ins.adsbygoogle',
    '.ad-container', '.ad-wrapper', '.video-ad'
  ];
  adSelectors.forEach(sel => {
    try { document.querySelectorAll(sel).forEach(el => el.remove()); } catch(e) {}
  });
}

document.addEventListener('DOMContentLoaded', () => {
  removeAds();
  setInterval(removeAds, 2000);
});

// Override window.open to prevent popup ads
window.open = function() { return null; };
</script>`;

    // Insert the injection script right after <head> or at the beginning
    if (rewrittenHtml.includes('<head>')) {
      rewrittenHtml = rewrittenHtml.replace('<head>', '<head>' + injectionScript);
    } else if (rewrittenHtml.includes('<html')) {
      rewrittenHtml = rewrittenHtml.replace(/<html[^>]*>/, '$&' + injectionScript);
    } else {
      rewrittenHtml = injectionScript + rewrittenHtml;
    }

    // Return the HTML with proper headers to allow iframe embedding
    return new NextResponse(rewrittenHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *;",
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
