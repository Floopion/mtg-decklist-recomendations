const BASE_URL = "https://api.mtgsingles.co.nz/MtgSingle";

const HEADERS: HeadersInit = {
  accept: "application/json, text/plain, */*",
  DNT: "1",
  Referer: "https://www.mtgsingles.co.nz/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};

/** Patterns for items that aren't playable cards. */
const EXCLUSION_TITLE_PATTERNS: RegExp[] = [
  /deck box/i,
  /sleeve/i,
  /playmat/i,
  /binder/i,
  /theme card/i,
  /art card/i,
  /art\s*series/i,
  /token$/i,
  /booster/i,
  /jumpstart front/i,
  /pro-100\+/i,
  /dice\+/i,
];

const EXCLUSION_SET_PATTERNS: RegExp[] = [
  /Jumpstart Front Cards/i,
  /Accessories/i,
  /Art Series/i,
];

function shouldExclude(
  title: string,
  setName?: string,
  features?: string[],
): boolean {
  for (const re of EXCLUSION_TITLE_PATTERNS) {
    if (re.test(title)) return true;
  }
  if (setName) {
    for (const re of EXCLUSION_SET_PATTERNS) {
      if (re.test(setName)) return true;
    }
  }
  // Exclude identical double-face repetitions e.g. "Word // Word"
  if (/\s*([^/]+?)\s*\/\/\s*\1\s*$/i.test(title)) return true;
  // Exclude sealed products
  if (features?.includes("Sealed")) return true;
  return false;
}

export interface NzPriceResult {
  cardName: string;
  cheapest: {
    store: string;
    price: string;
    priceNum: number;
    condition: string;
    url: string;
  } | null;
}

/**
 * Look up a single card on MTG Singles NZ.
 * Returns the cheapest NZ listing, or null if not found.
 */
export async function lookupNzPrice(
  cardName: string,
): Promise<NzPriceResult> {
  const params = new URLSearchParams({
    query: cardName,
    page: "1",
    pageSize: "20",
    Country: "1",
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: HEADERS,
  });

  if (!res.ok) {
    console.log(`[NZ] ${cardName}: HTTP ${res.status}`);
    return { cardName, cheapest: null };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    console.log(`[NZ] ${cardName}: failed to parse JSON`);
    return { cardName, cheapest: null };
  }

  // API returns a flat array of listings
  const items = Array.isArray(json) ? (json as Record<string, unknown>[]) : [];

  console.log(`[NZ] ${cardName}: ${items.length} listings`);

  // Filter and find cheapest
  let cheapest: NzPriceResult["cheapest"] = null;

  for (const it of items) {
    const title = String(it.title ?? "");
    const setName = it.setName ? String(it.setName) : undefined;
    const features = Array.isArray(it.features)
      ? (it.features as string[])
      : undefined;

    if (shouldExclude(title, setName, features)) continue;

    // Name must roughly match the searched card (case-insensitive)
    if (!title.toLowerCase().includes(cardName.toLowerCase())) continue;

    // Price is a string like "$2.83" — parse it
    const priceStr = String(it.price ?? "");
    const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
    if (isNaN(priceNum) || priceNum <= 0) continue;

    const store = String(it.store ?? "Unknown");
    const condition = String(it.condition ?? "NM").toUpperCase();
    const url = String(it.url ?? "");

    if (!cheapest || priceNum < cheapest.priceNum) {
      cheapest = {
        store: store.replace(/^NZ\//i, ""),
        price: priceStr,
        priceNum,
        condition,
        url,
      };
    }
  }

  console.log(`[NZ] ${cardName}: ${cheapest ? `${cheapest.price} @ ${cheapest.store}` : "not found"}`);
  return { cardName, cheapest };
}
