import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/stream - Server-side player proxy with AD BLOCKING
 * 
 * Key fix: Player JS makes relative API calls like fetch("/api/v1/info?id=xxx")
 * These now go to OUR domain where /api/v1/* proxy routes forward them to rpmplay.xyz
 * 
 * Usage: /api/stream?trembed=0&trid=10026&trtype=1
 */

const AD_DOMAINS = [
  'imasdk.googleapis.com', 'googlesyndication.com', 'googleadservices.com',
  'doubleclick.net', 'googleads.g.doubleclick.net', 'pagead2.googlesyndication.com',
  'tpc.googlesyndication.com', 'ad.doubleclick.net', 'propellerads.com',
  'exoclick.com', 'juicyads.com', 'clickadu.com', 'popunder.net',
  'adsterra.com', 'hilltopads.com', 'pushnotifications.com', 'notix.io',
  'pushwoosh.com', 'cleverpush.com', 'propeller.popsandbox.com',
];

async function fetchEmbedPage(trembed: string, trid: string, trtype: string): Promise<{ playerUrl: string; videoId: string }> {
  const embedUrl = `https://desicinemas.pk/?trembed=${trembed}&trid=${trid}&trtype=${trtype}`;
  const res = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': 'https://desicinemas.pk/',
    },
  });
  const html = await res.text();
  
  const iframeMatch = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/i);
  if (iframeMatch?.[1]) {
    const playerUrl = iframeMatch[1];
    const videoId = playerUrl.match(/#([a-zA-Z0-9]+)$/)?.[1] || '';
    return { playerUrl, videoId };
  }

  const dataSrcMatch = html.match(/<iframe[^>]*data-(?:src|litespeed-src)="([^"]+)"[^>]*>/i);
  if (dataSrcMatch?.[1]) {
    const playerUrl = dataSrcMatch[1];
    const videoId = playerUrl.match(/#([a-zA-Z0-9]+)$/)?.[1] || '';
    return { playerUrl, videoId };
  }

  return { playerUrl: '', videoId: '' };
}

async function fetchPlayerHtml(playerUrl: string): Promise<string> {
  const res = await fetch(playerUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
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
      videoId = directUrl.match(/#([a-zA-Z0-9]+)$/)?.[1] || '';
    }

    if (!playerUrl) {
      return NextResponse.json({ success: false, error: 'Could not find player URL' }, { status: 404 });
    }

    const playerHtml = await fetchPlayerHtml(playerUrl);
    const playerDomain = new URL(playerUrl).origin;

    let rewrittenHtml = playerHtml;

    // ====== STEP 1: Remove ad scripts ======
    rewrittenHtml = rewrittenHtml.replace(/<script[^>]*imasdk\.googleapis\.com[^>]*><\/script>/gi, '');
    for (const adDomain of AD_DOMAINS) {
      const regex = new RegExp(`<script[^>]*${adDomain.replace('.', '\\.')}[^>]*>\\s*<\/script>`, 'gi');
      rewrittenHtml = rewrittenHtml.replace(regex, '');
    }

    // ====== STEP 2: Rewrite asset URLs to absolute ======
    rewrittenHtml = rewrittenHtml
      .replace(/src="\/assets\//g, `src="${playerDomain}/assets/`)
      .replace(/src="\/cdn-cgi\//g, `src="${playerDomain}/cdn-cgi/`)
      .replace(/href="\/assets\//g, `href="${playerDomain}/assets/`)
      .replace(/href="\/favicon/g, `href="${playerDomain}/favicon`)
      .replace(/url\(\/assets\//g, `url(${playerDomain}/assets/`);

    // ====== STEP 3: Remove frame-busting + analytics ======
    rewrittenHtml = rewrittenHtml
      .replace(/if\s*\(\s*top\s*!==?\s*self\s*\)[\s\S]*?(?:\}|location\.href)/gi, '')
      .replace(/if\s*\(\s*window\s*!==?\s*window\.top\s*\)[\s\S]*?(?:\}|location\.href)/gi, '')
      .replace(/<script[^>]*googletagmanager[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*google-analytics[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*mc\.yandex[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*cloudflareinsights[^>]*>[\s\S]*?<\/script>/gi, '');

    // ====== STEP 4: Inject scripts ======
    // KEY FIX: Player JS uses fetch("/api/v1/info?id=xxx") - relative URLs
    // We have /api/v1/* proxy routes on our server that forward to rpmplay.xyz
    // So relative API calls will work automatically!
    // No need to rewrite fetch URLs in the JS
    
    const injectionScript = `
<script>
// ============ SANDBOX BYPASS ============
try {
  Object.defineProperty(window, 'top', { get: () => window });
  Object.defineProperty(window, 'parent', { get: () => window });
  window.frameElement = null;
} catch(e) {}

// ============ BLOCK GOOGLE IMA SDK ============
Object.defineProperty(window, 'google', {
  get() {
    return {
      ima: {
        AdsLoader: function() { this.addEventListener = function(){}; this.requestAds = function(){}; },
        AdsManager: function() { this.start = function(){}; this.addEventListener = function(){}; this.destroy = function(){}; },
        AdsRequest: function() {},
        AdsRenderingSettings: function() {},
        AdDisplayContainer: function() {},
        AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: '' } },
        AdEvent: { Type: { STARTED: '', COMPLETED: '', SKIPPABLE_STATE_CHANGED: '' } },
        AdErrorEvent: { Type: { AD_ERROR: '' } },
        ViewMode: { NORMAL: '', FULLSCREEN: '' },
      }
    };
  },
  set() {},
  configurable: true
});

// ============ BLOCK AD SCRIPTS ============
const origCreateElement = document.createElement.bind(document);
document.createElement = function(tag) {
  const el = origCreateElement(tag);
  if (tag.toLowerCase() === 'script') {
    const origSrcSet = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (origSrcSet) {
      Object.defineProperty(el, 'src', {
        set(val) {
          const blocked = ['imasdk','ima3.js','googlesyndication','doubleclick','googleadservices',
            'propellerads','exoclick','clickadu','popunder','adsterra','hilltopads','notix.io'];
          if (blocked.some(d => val && val.includes(d))) return;
          origSrcSet.set.call(el, val);
        },
        get() { return origSrcSet.get.call(el); }
      });
    }
  }
  return el;
};

// ============ BLOCK AD FETCH/XHR ============
const adDomains = ['imasdk.googleapis.com','googlesyndication.com','doubleclick.net',
  'googleadservices.com','propellerads.com','exoclick.com','clickadu.com',
  'popunder.net','adsterra.com','hilltopads.com','notix.io','adnxs.com','adsrvr.org'];

const _origFetch = window.fetch;
window.fetch = function(url, options) {
  if (typeof url === 'string' && adDomains.some(d => url.includes(d))) {
    return Promise.resolve(new Response('', { status: 200 }));
  }
  return _origFetch.apply(this, arguments);
};

const _origXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
  if (typeof url === 'string' && adDomains.some(d => url.includes(d))) return;
  return _origXHROpen.apply(this, arguments);
};

// ============ BLOCK POPUPS ============
window.open = function() { return null; };
window.alert = function() {};
window.confirm = function() { return true; };
window.prompt = function() { return null; };
if (window.Notification) { Notification.requestPermission = function() { return Promise.resolve('denied'); }; }
window.onbeforeunload = null;

// ============ DOM AD CLEANUP ============
function removeAds() {
  document.querySelectorAll('iframe').forEach(iframe => {
    const src = (iframe.src || '').toLowerCase();
    if (['ad','banner','pop','doubleclick','googlesyndication','propeller','exoclick'].some(p => src.includes(p))) iframe.remove();
  });
  ['ins.adsbygoogle','[id*="ad-"]','[class*="ad-"]','[id*="banner"]','[class*="banner"]',
   '.ad-container','.ad-wrapper','.video-ad','[data-ad]','div[id^="google_ads"]','.sponsor'].forEach(sel => {
    try { document.querySelectorAll(sel).forEach(el => el.remove()); } catch(e) {}
  });
}

// ============ MUTATION OBSERVER ============
new MutationObserver(mutations => {
  for (const m of mutations) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    if (n.tagName === 'IFRAME' && ['ad','banner','pop','doubleclick'].some(p => (n.src||'').toLowerCase().includes(p))) n.remove();
    if (n.tagName === 'SCRIPT' && ['ima3','googlesyndication','doubleclick'].some(p => (n.src||'').toLowerCase().includes(p))) n.remove();
  }
}).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener('DOMContentLoaded', () => { removeAds(); setInterval(removeAds, 3000); });
</script>`;

    if (rewrittenHtml.includes('<head>')) {
      rewrittenHtml = rewrittenHtml.replace('<head>', '<head>' + injectionScript);
    } else {
      rewrittenHtml = injectionScript + rewrittenHtml;
    }

    // Return HTML - allow ALL connections since player needs to talk to rpmplay.xyz
    // The /api/v1/* proxy routes on our server handle the relative API calls
    return new NextResponse(rewrittenHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors *;",
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
