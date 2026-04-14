import { NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE = "lex_token";

const AUTH_PATHS = ["/login", "/register"];
const PUBLIC_PATHS = [...AUTH_PATHS, "/_next", "/favicon.ico"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_COOKIE)?.value;

  if (isPublic(pathname) && !isAuthPath(pathname)) {
    return NextResponse.next();
  }

  if (!token && !isAuthPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (token && isAuthPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
