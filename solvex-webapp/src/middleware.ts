import { NextResponse, type NextRequest } from 'next/server';

const LOCALE_HEADER = 'x-solvex-locale';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const headers = new Headers(request.headers);

  if (pathname === '/bn' || pathname.startsWith('/bn/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    headers.set(LOCALE_HEADER, 'bn');
    return NextResponse.rewrite(url, { request: { headers } });
  }

  headers.set(LOCALE_HEADER, 'en');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  runtime: 'experimental-edge',
  matcher: ['/((?!api|_next/static|_next/image|sitemap.xml|robots.txt|.*\\.).*)'],
};
