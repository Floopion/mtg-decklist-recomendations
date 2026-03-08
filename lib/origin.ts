import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://dbedford.dev",
  "https://www.dbedford.dev",
  process.env.NEXT_PUBLIC_PORTFOLIO_URL,
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://localhost:3001"]
    : []),
].filter(Boolean) as string[]);

export function checkOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
