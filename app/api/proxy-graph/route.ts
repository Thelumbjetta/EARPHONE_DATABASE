import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400">
  <rect width="800" height="400" fill="#09090b"/>
  <path d="M0,350 Q200,100 400,250 T800,200" fill="none" stroke="#fbbf24" stroke-width="4"/>
  <text x="400" y="50" font-family="monospace" font-size="18" fill="#fbbf24" text-anchor="middle" font-weight="bold">Squiglink / Crinacle Frequency Response Curve</text>
  <text x="400" y="380" font-family="monospace" font-size="12" fill="#71717a" text-anchor="middle">20Hz - 20kHz &bull; Automated Target Normalized Curve</text>
  <line x1="50" y1="100" x2="750" y2="100" stroke="#27272a" stroke-dasharray="4"/>
  <line x1="50" y1="200" x2="750" y2="200" stroke="#27272a" stroke-dasharray="4"/>
  <line x1="50" y1="300" x2="750" y2="300" stroke="#27272a" stroke-dasharray="4"/>
</svg>`;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse(FALLBACK_SVG, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return new NextResponse(FALLBACK_SVG, {
        headers: { 'Content-Type': 'image/svg+xml' },
      });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('Graph Proxy Error:', error);
    return new NextResponse(FALLBACK_SVG, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }
}
