import { NextRequest, NextResponse } from 'next/server';

async function getExpectedToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD ?? '';
  const day = Math.floor(Date.now() / 86400000).toString();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(day));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  const expected = await getExpectedToken();
  if (!token || token !== expected) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
