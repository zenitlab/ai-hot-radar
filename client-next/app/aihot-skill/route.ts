import { NextResponse } from 'next/server';

/**
 * Old skill link, still in agents' memories and third-party listings. It was
 * never reachable through Next (only the backend served it), so send it on to
 * the installable Markdown skill.
 */
export function GET(request: Request) {
  return NextResponse.redirect(new URL('/skill.md', request.url), 308);
}
