import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId') || '';
  const playerDomain = searchParams.get('domain') || 'movieshub.rpmplay.xyz';

  if (!videoId) {
    return NextResponse.json({ success: false, error: 'videoId is required' }, { status: 400 });
  }

  try {
    // Get folder hash first
    const folderUrl = `https://${playerDomain}/api/v1/folder?id=${videoId}`;
    const folderRes = await fetch(folderUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `https://${playerDomain}/`,
      },
    });
    const folderHash = (await folderRes.text()).trim();

    // Get encrypted video info
    const infoUrl = `https://${playerDomain}/api/v1/info?id=${videoId}`;
    const infoRes = await fetch(infoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `https://${playerDomain}/`,
      },
    });
    const encryptedData = await infoRes.text();

    // Fetch the player page HTML for title and poster
    const playerUrl = `https://${playerDomain}/#${videoId}`;
    const playerRes = await fetch(playerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });
    const playerHtml = await playerRes.text();

    const titleMatch = playerHtml.match(/<title>([^<]+)<\/title>/i);
    const playerTitle = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').trim() : '';

    const posterMatch = playerHtml.match(/poster\.png[^"']*/i) || 
                        playerHtml.match(/background-image:\s*url\(["']?([^"')]+)/i);
    const poster = posterMatch ? (posterMatch[1] || posterMatch[0]) : '';

    return NextResponse.json({
      success: true,
      videoId,
      playerDomain,
      playerUrl,
      playerTitle,
      poster: poster.startsWith('/') ? `https://${playerDomain}${poster}` : poster,
      folderHash,
      encryptedData,
      embedUrl: `https://${playerDomain}/#${videoId}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
