import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/stream - Server-side player proxy with AD BLOCKING
 * 
 * This endpoint:
 * 1. Fetches the video player page from rpmplay.xyz
 * 2. STRIPS out Google IMA SDK (ima3.js) - no pre-roll/mid-roll video ads
 * 3. Blocks ad script URLs from loading
 * 4. Injects sandbox bypass + aggressive ad removal
 * 5. Serves from our own domain - no sandbox error
 * 
 * Usage: /api/stream?trembed=0&trid=10026&trtype=1
 */

// Known ad domains to block
const AD_DOMAINS = [
  'imasdk.googleapis.com',
  'googlesyndication.com',
  'googleadservices.com',
  'doubleclick.net',
  'googleads.g.doubleclick.net',
  'pagead2.googlesyndication.com',
  'tpc.googlesyndication.com',
  'ad.doubleclick.net',
  'propellerads.com',
  'exoclick.com',
  'juicyads.com',
  'clickadu.com',
  'popunder.net',
  'adsterra.com',
  'hilltopads.com',
  'pushnotifications.com',
  'push.js',
  'notix.io',
  'pushwoosh.com',
  'cleverpush.com',
  'propeller.popsandbox.com',
];

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
  
  const iframeMatch = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/i);
  if (iframeMatch && iframeMatch[1]) {
    const playerUrl = iframeMatch[1];
    const hashMatch = playerUrl.match(/#([a-zA-Z0-9]+)$/);
    const videoId = hashMatch ? hashMatch[1] : '';
    return { playerUrl, videoId };
  }

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

    const playerHtml = await fetchPlayerHtml(playerUrl);
    const playerDomain = new URL(playerUrl).origin;

    // ====== STEP 1: Block ad scripts from loading ======
    let rewrittenHtml = playerHtml;

    // Remove Google IMA SDK script tag entirely (this loads pre-roll video ads)
    rewrittenHtml = rewrittenHtml.replace(/<script[^>]*imasdk\.googleapis\.com[^>]*><\/script>/gi, '');
    rewrittenHtml = rewrittenHtml.replace(/<script[^>]*ima3\.js[^>]*><\/script>/gi, '');
    
    // Remove any script tags that load from known ad domains
    for (const adDomain of AD_DOMAINS) {
      const regex = new RegExp(`<script[^>]*${adDomain.replace('.', '\\.')}[^>]*>\\s*<\/script>`, 'gi');
      rewrittenHtml = rewrittenHtml.replace(regex, '');
    }

    // ====== STEP 2: Rewrite relative URLs to absolute ======
    rewrittenHtml = rewrittenHtml
      .replace(/src="\/assets\//g, `src="${playerDomain}/assets/`)
      .replace(/src="\/cdn-cgi\//g, `src="${playerDomain}/cdn-cgi/`)
      .replace(/href="\/assets\//g, `href="${playerDomain}/assets/`)
      .replace(/href="\/favicon/g, `href="${playerDomain}/favicon`)
      .replace(/url\(\/assets\//g, `url(${playerDomain}/assets/`);

    // ====== STEP 3: Remove frame-busting scripts ======
    rewrittenHtml = rewrittenHtml
      .replace(/if\s*\(\s*top\s*!==?\s*self\s*\)[\s\S]*?(?:\}|location\.href)/gi, '// frame-bust removed')
      .replace(/if\s*\(\s*window\s*!==?\s*window\.top\s*\)[\s\S]*?(?:\}|location\.href)/gi, '// frame-bust removed');

    // ====== STEP 4: Remove analytics/tracking that slow the player ======
    rewrittenHtml = rewrittenHtml
      .replace(/<script[^>]*googletagmanager[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*google-analytics[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*mc\.yandex[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*cloudflareinsights[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*sharethis[^>]*>[\s\S]*?<\/script>/gi, '');

    // ====== STEP 5: Inject HEAVY ad-block + sandbox bypass script ======
    const injectionScript = `
<script>
// ============ SANDBOX BYPASS ============
try {
  Object.defineProperty(window, 'top', { get: () => window });
  Object.defineProperty(window, 'parent', { get: () => window });
  window.frameElement = null;
} catch(e) {}

// ============ BLOCK GOOGLE IMA SDK ============
// Prevent the player from initializing Google IMA ads
// This kills pre-roll, mid-roll, and post-roll video ads
if (window.google) {
  delete window.google.ima;
}
Object.defineProperty(window, 'google', {
  get() {
    const g = {};
    // Return empty ima object - player will fail silently when trying to load ads
    g.ima = {
      AdsLoader: function() { this.addEventListener = function(){}; this.requestAds = function(){}; },
      AdsManager: function() { this.start = function(){}; this.addEventListener = function(){}; this.destroy = function(){}; },
      AdsRequest: function() {},
      AdsRenderingSettings: function() {},
      AdDisplayContainer: function() {},
      AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: '' } },
      AdEvent: { Type: { STARTED: '', COMPLETED: '', SKIPPABLE_STATE_CHANGED: '' } },
      AdErrorEvent: { Type: { AD_ERROR: '' } },
      ViewMode: { NORMAL: '', FULLSCREEN: '' },
    };
    return g;
  },
  set() {}
});

// ============ BLOCK AD SCRIPTS FROM LOADING ============
// Intercept script creation to block ad scripts
const origCreateElement = document.createElement.bind(document);
document.createElement = function(tag) {
  const el = origCreateElement(tag);
  if (tag.toLowerCase() === 'script') {
    const origSrcSet = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (origSrcSet) {
      Object.defineProperty(el, 'src', {
        set(val) {
          const blocked = [
            'imasdk.googleapis.com', 'ima3.js', 'googlesyndication.com',
            'doubleclick.net', 'googleadservices.com', 'googleads',
            'propellerads', 'exoclick', 'clickadu', 'popunder',
            'adsterra', 'hilltopads', 'notix.io', 'pushnotifications',
            'sharethis.com', 'addthis.com', 'disqus.com/next/',
            'adnxs.com', 'adsrvr.org', 'taboola.com', 'outbrain.com'
          ];
          if (blocked.some(d => val && val.includes(d))) {
            console.log('[AD-BLOCK] Blocked script:', val);
            return;
          }
          origSrcSet.set.call(el, val);
        },
        get() {
          return origSrcSet.get.call(el);
        }
      });
    }
  }
  return el;
};

// ============ BLOCK FETCH/XHR TO AD DOMAINS ============
const adDomains = [
  'imasdk.googleapis.com', 'googlesyndication.com', 'doubleclick.net',
  'googleadservices.com', 'googleads.g.doubleclick.net', 'propellerads.com',
  'exoclick.com', 'clickadu.com', 'popunder.net', 'adsterra.com',
  'hilltopads.com', 'notix.io', 'adnxs.com', 'adsrvr.org',
  'taboola.com', 'outbrain.com'
];

const origFetch = window.fetch;
window.fetch = function(url, options) {
  if (typeof url === 'string' && adDomains.some(d => url.includes(d))) {
    console.log('[AD-BLOCK] Blocked fetch:', url);
    return Promise.resolve(new Response('', { status: 200 }));
  }
  return origFetch.apply(this, arguments);
};

const origXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
  if (typeof url === 'string' && adDomains.some(d => url.includes(d))) {
    console.log('[AD-BLOCK] Blocked XHR:', url);
    return;
  }
  return origXHROpen.apply(this, arguments);
};

// ============ AGGRESSIVE DOM AD REMOVAL ============
function removeAds() {
  // Remove ad iframes
  document.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.src || '';
    const adPatterns = ['ad', 'banner', 'pop', 'doubleclick', 'googlesyndication', 
                       'propeller', 'exoclick', 'clickadu', 'popunder', 'adsterra'];
    if (adPatterns.some(p => src.toLowerCase().includes(p))) {
      iframe.remove();
    }
  });

  // Remove common ad containers
  const adSelectors = [
    'ins.adsbygoogle', '[id*="ad-"]', '[id*="ad_"]', '[class*="ad-"]',
    '[class*="ad_"]', '[id*="banner"]', '[class*="banner"]',
    '.ad-container', '.ad-wrapper', '.video-ad', '.ad-display',
    '[class*="popup"]', '[class*="overlay-ad"]', '[id*="popup"]',
    '[data-ad]', '[data-ad-slot]', '[data-ad-client]',
    'div[id^="google_ads"]', 'div[id^="div-gpt-ad"]',
    '.google-ad', '.sponsor', '.sponsored'
  ];
  adSelectors.forEach(sel => {
    try { document.querySelectorAll(sel).forEach(el => el.remove()); } catch(e) {}
  });

  // Remove any element with onclick that opens a URL (popup ad pattern)
  document.querySelectorAll('[onclick]').forEach(el => {
    const onclick = el.getAttribute('onclick') || '';
    if (onclick.includes('window.open') || onclick.includes('location.href') || onclick.includes('http')) {
      el.removeAttribute('onclick');
    }
  });
}

// ============ BLOCK POPUPS ============
window.open = function() { return null; };
window.alert = function() {};
window.confirm = function() { return true; };
window.prompt = function() { return null; };

// ============ BLOCK NOTIFICATIONS ============
if (window.Notification) {
  Notification.requestPermission = function() { return Promise.resolve('denied'); };
}

// ============ BLOCK POPUNDERS ============
window.onbeforeunload = null;
document.addEventListener('click', function(e) {
  // Prevent click-under/popunder ads
  const target = e.target;
  if (target.tagName === 'A' && target.target === '_blank') {
    const href = target.href || '';
    const adPatterns = ['ad', 'pop', 'banner', 'doubleclick', 'track'];
    if (adPatterns.some(p => href.toLowerCase().includes(p))) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}, true);

// ============ CONTINUOUS AD CLEANUP ============
document.addEventListener('DOMContentLoaded', () => {
  removeAds();
  // Run every 1 second for the first 30 seconds (ads load after player)
  let count = 0;
  const interval = setInterval(() => {
    removeAds();
    count++;
    if (count > 30) {
      clearInterval(interval);
      // Then run every 5 seconds
      setInterval(removeAds, 5000);
    }
  }, 1000);
});

// ============ ALSO USE MUTATION OBSERVER ============
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) {
        // Check if the new element is an ad
        if (node.tagName === 'IFRAME') {
          const src = node.src || '';
          const adPatterns = ['ad', 'banner', 'pop', 'doubleclick', 'googlesyndication'];
          if (adPatterns.some(p => src.toLowerCase().includes(p))) {
            node.remove();
          }
        }
        if (node.tagName === 'SCRIPT') {
          const src = node.src || '';
          const adPatterns = ['ima3', 'googlesyndication', 'doubleclick', 'propeller', 'adsterra'];
          if (adPatterns.some(p => src.toLowerCase().includes(p))) {
            node.remove();
          }
        }
        // Check for inline ad divs
        if (node.id && (node.id.includes('ad') || node.id.includes('banner') || node.id.includes('popup'))) {
          node.remove();
        }
        if (node.className && typeof node.className === 'string' && 
            (node.className.includes('ad-') || node.className.includes('banner') || node.className.includes('popup'))) {
          node.remove();
        }
      }
    }
  }
});

// Start observing when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  observer.observe(document.body || document.documentElement, {
    childList: true, subtree: true
  });
});
</script>`;

    // Insert injection script
    if (rewrittenHtml.includes('<head>')) {
      rewrittenHtml = rewrittenHtml.replace('<head>', '<head>' + injectionScript);
    } else if (rewrittenHtml.includes('<html')) {
      rewrittenHtml = rewrittenHtml.replace(/<html[^>]*>/, '$&' + injectionScript);
    } else {
      rewrittenHtml = injectionScript + rewrittenHtml;
    }

    // Return with ad-blocking headers + iframe-friendly headers
    return new NextResponse(rewrittenHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': [
          "frame-ancestors *;",
          // Block ad domains from loading via CSP
          ...AD_DOMAINS.map(d => `connect-src 'self' https://movieshub.rpmplay.xyz https://*.rpmplay.xyz https://desicinemas.pk https://image.tmdb.org;`).slice(0, 1),
        ].join(' '),
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
