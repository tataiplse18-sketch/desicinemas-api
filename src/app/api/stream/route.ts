import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/stream - Extracts DIRECT VIDEO STREAM URL (m3u8) from rpmplay.xyz
 * 
 * Instead of proxying the entire HTML player page (which breaks on Vercel),
 * this endpoint extracts the actual video stream URL by calling the
 * rpmplay.xyz API directly. The frontend then plays the stream using HLS.js.
 * 
 * Usage: /api/stream?trembed=0&trid=10026&trtype=1
 * 
 * Returns JSON: { success, streamUrl, videoId, source, poster, tracks, title }
 */

// Step 1: Get embed page from desicinemas.pk → extract rpmplay.xyz player URL
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
  
  // Try multiple patterns to find the iframe src
  const patterns = [
    /<iframe[^>]*src="([^"]+)"[^>]*>/i,
    /<iframe[^>]*data-src="([^"]+)"[^>]*>/i,
    /<iframe[^>]*data-litespeed-src="([^"]+)"[^>]*>/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const playerUrl = match[1];
      const videoId = playerUrl.match(/#([a-zA-Z0-9]+)$/)?.[1] || '';
      return { playerUrl, videoId };
    }
  }

  return { playerUrl: '', videoId: '' };
}

// Step 2: Call rpmplay.xyz API to get video info and stream URL
async function getVideoStream(playerUrl: string, videoId: string): Promise<{
  streamUrl: string;
  source: string;
  poster: string;
  tracks: any[];
  title: string;
}> {
  const playerDomain = new URL(playerUrl).origin;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': playerUrl,
    'Origin': playerDomain,
    'Accept': 'application/json, text/plain, */*',
  };
  
  // Call /api/v1/info to get video metadata
  let infoData: any = {};
  try {
    const infoRes = await fetch(`${playerDomain}/api/v1/info?id=${encodeURIComponent(videoId)}`, { headers });
    const infoText = await infoRes.text();
    infoData = JSON.parse(infoText);
  } catch (e) {
    console.error('Failed to fetch info:', e);
  }
  
  // Call /api/v1/video to get the actual stream URL
  let streamUrl = '';
  let source = 'hls';
  let poster = '';
  let tracks: any[] = [];
  let title = '';
  
  try {
    const videoRes = await fetch(`${playerDomain}/api/v1/video?id=${encodeURIComponent(videoId)}`, { headers });
    const videoText = await videoRes.text();
    
    try {
      const videoData = JSON.parse(videoText);
      
      // The API typically returns something like:
      // { source: "hls", sourceUrls: ["https://...m3u8"], poster: "...", tracks: [...], title: "..." }
      // OR { file: "https://...m3u8", type: "hls", ... }
      
      if (videoData.sourceUrls && videoData.sourceUrls.length > 0) {
        streamUrl = videoData.sourceUrls[0];
        source = videoData.source || 'hls';
      } else if (videoData.file) {
        streamUrl = videoData.file;
        source = videoData.type || 'hls';
      } else if (videoData.url) {
        streamUrl = videoData.url;
        source = videoData.source || 'hls';
      } else if (videoData.sources) {
        // Sometimes sources is an array
        if (Array.isArray(videoData.sources) && videoData.sources.length > 0) {
          const bestSource = videoData.sources.find((s: any) => s.quality === 'default') || videoData.sources[0];
          streamUrl = bestSource.file || bestSource.url || bestSource.src || '';
          source = bestSource.type || 'hls';
        }
      }
      
      poster = videoData.poster || infoData.poster || '';
      tracks = videoData.tracks || infoData.tracks || [];
      title = videoData.title || infoData.title || '';
    } catch {
      // If JSON parsing fails, try to extract m3u8 URL from text
      const m3u8Match = videoText.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
      if (m3u8Match) {
        streamUrl = m3u8Match[0];
        source = 'hls';
      }
    }
  } catch (e) {
    console.error('Failed to fetch video URL:', e);
  }
  
  // Fallback: try the /api/v1/player endpoint
  if (!streamUrl) {
    try {
      const playerRes = await fetch(`${playerDomain}/api/v1/player?t=${encodeURIComponent(videoId)}`, { headers });
      const playerText = await playerRes.text();
      
      // Try to extract m3u8 URL
      const m3u8Match = playerText.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/);
      if (m3u8Match) {
        streamUrl = m3u8Match[0];
        source = 'hls';
      }
      
      // Try to extract mp4 URL
      if (!streamUrl) {
        const mp4Match = playerText.match(/https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/);
        if (mp4Match) {
          streamUrl = mp4Match[0];
          source = 'mp4';
        }
      }
      
      // Try JSON parse
      if (!streamUrl) {
        try {
          const playerData = JSON.parse(playerText);
          streamUrl = playerData.file || playerData.url || playerData.sourceUrl || '';
          if (streamUrl) source = playerData.type || playerData.source || 'hls';
        } catch {}
      }
    } catch (e) {
      console.error('Failed to fetch player data:', e);
    }
  }
  
  return { streamUrl, source, poster, tracks, title };
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

    // Step 1: Get the player URL and video ID
    if (!directUrl) {
      const embedInfo = await fetchEmbedPage(trembed, trid, trtype);
      playerUrl = embedInfo.playerUrl;
      videoId = embedInfo.videoId;
    } else {
      videoId = directUrl.match(/#([a-zA-Z0-9]+)$/)?.[1] || '';
    }

    if (!playerUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not find player URL from embed page. The embed pattern may have changed.' 
      }, { status: 404 });
    }

    if (!videoId) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract video ID from player URL.',
        playerUrl,
      }, { status: 404 });
    }

    // Step 2: Get the direct stream URL from the API
    const streamData = await getVideoStream(playerUrl, videoId);

    if (!streamData.streamUrl) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract stream URL from player API. The video may be protected or the API format has changed.',
        playerUrl,
        videoId,
      }, { status: 404 });
    }

    // Return the stream data - frontend will use HLS.js to play
    return NextResponse.json({
      success: true,
      streamUrl: streamData.streamUrl,
      source: streamData.source,
      poster: streamData.poster,
      tracks: streamData.tracks,
      title: streamData.title,
      videoId,
      playerUrl,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
