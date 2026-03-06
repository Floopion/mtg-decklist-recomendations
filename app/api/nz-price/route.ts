import { NextResponse } from "next/server";
import { lookupNzPrice } from "@/lib/mtgsingles";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

interface NzPriceRequest {
  cardName: string;
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(request);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body: NzPriceRequest = await request.json();

    if (!body.cardName || typeof body.cardName !== "string") {
      return NextResponse.json(
        { error: "Missing cardName" },
        { status: 400 },
      );
    }

    const result = await lookupNzPrice(body.cardName.trim());
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to look up NZ price";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
