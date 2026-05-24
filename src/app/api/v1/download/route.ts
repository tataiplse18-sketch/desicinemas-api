import { NextRequest, NextResponse } from 'next/server';

// Proxy: /api/v1/download?id=xxx → movieshub.rpmplay.xyz/api/v1/download?id=xxx
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') || '';
  
  try {
    const res = await fetch(`https://movieshub.rpmplay.xyz/api/v1/download?id=${encodeURIComponent(id)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://movieshub.rpmplay.xyz/',
        'Origin': 'https://movieshub.rpmplay.xyz',
      },
    });
    const data = await res.text();
    
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
