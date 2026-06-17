import { NextResponse, type NextRequest } from "next/server";

const noStorePaths = [
  "/dashboard",
  "/login",
  "/cadastro",
  "/sucesso",
  "/cancelado"
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (noStorePaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/cadastro", "/sucesso", "/cancelado"]
};
