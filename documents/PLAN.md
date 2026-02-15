# MTG Decklist Recommendation App - Architecture Plan

## Current State
Fresh Next.js 16.1.6 scaffold (React 19, Tailwind v4, TypeScript 5). Single initial commit. No domain code yet.

---

## 1. APIs

### Primary: Scryfall (card data + images)
- **No auth required**, full CORS support, 10 req/sec limit
- Endpoints we'll use:
  - `/cards/named?fuzzy=` — resolve card names from decklist input
  - `/cards/collection` — batch lookup (POST up to 75 cards)
  - `/cards/search?q=` — search for recommendations
  - `/cards/autocomplete` — typeahead in the input
- Images hosted on `cards.scryfall.io` (no rate limit, hotlinking allowed)
- Provides: oracle text, mana cost, color identity, legalities, prices

### LLM: Gemini 2.0 Flash (recommendations engine)
- Called **server-side only** via edge function / Route Handler
- User pastes decklist → server validates → sends structured prompt to Gemini → returns recommendations
- System prompt constrains output to MTG-only responses
- Model returns structured JSON (card suggestions + reasoning)

### Secondary: Archidekt (deck import via URL)
- Public decks accessible at `https://archidekt.com/api/decks/{id}/` — no auth for public decks
- Deck ID extracted from URL pattern: `archidekt.com/decks/{id}/...`
- Fetched **server-side only** to avoid CORS and to enforce SSRF protection
- SSRF defense: allowlist only `archidekt.com` domain, reject all other URLs
- Undocumented API — may break, so treat as a convenience feature with graceful fallback to manual paste

### Not using (and why)
| API | Reason to skip |
|-----|---------------|
| EDHREC | No public API; scraping is fragile and legally grey |
| Magicthegathering.io | No CORS, single maintainer, Scryfall is strictly better |
| Moxfield | No public API, Cloudflare-protected |

---

## 2. UI: shadcn/ui

**Why shadcn over alternatives:**
- Native Tailwind v4 — zero friction with existing stack
- Copy-paste model = we own every component, LLMs can read/modify them directly (great for the AI-dev showcase angle)
- Dark mode via CSS variables (MTG apps look better dark)
- Radix primitives underneath for accessibility
- 83k+ GitHub stars, largest ecosystem of examples
- Feb 2026 update adds Base UI as alternative primitive layer (future-proofs against Radix maintenance concerns)

**Key components we'll use:**
`card`, `button`, `input`, `textarea`, `dialog`, `tabs`, `badge`, `skeleton`, `toast`, `separator`, `scroll-area`

---

## 3. Architecture

```
┌──────────────────────────────────────┐
│           Browser (Client)            │
│                                      │
│  Input: Textarea OR Archidekt URL    │
│  (auto-detect which one)             │
│  Results display (card grid)         │
│  Card images (Scryfall CDN)          │
└──────────────┬───────────────────────┘
               │ POST /api/recommend
               ▼
┌──────────────────────────────────────┐
│       Next.js Route Handler           │
│       (Edge runtime, streaming)       │
│                                      │
│  1. Validate & sanitize input        │
│  2. Rate limit (Upstash Redis)       │
│  3. If Archidekt URL:                │
│     a. Validate domain (SSRF guard)  │
│     b. Fetch deck from Archidekt API │
│     c. Parse into card name list     │
│  4. INPUT GROUNDING:                 │
│     Resolve all cards via Scryfall   │
│     /cards/collection (batches of 75)│
│     → verified oracle text, colors,  │
│       mana costs, types, legality    │
│  5. Build prompt with Scryfall data  │
│     as source of truth               │
│  6. Stream Gemini Flash response     │
│  7. OUTPUT VALIDATION:               │
│     Resolve Gemini's suggestions     │
│     against Scryfall — drop any card │
│     Scryfall can't find              │
│  8. Stream validated results         │
└──────────────┬───────────────────────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
  Scryfall  Gemini   Archidekt
  (no auth) (key)    (no auth,
                      server-side)
```

### Prompt engineering strategy

The goal: Gemini should act like an experienced Commander deckbuilder who can see the full picture, not just a list of card names.

#### What we compute server-side and inject into the prompt

From the Scryfall-resolved card data, we pre-compute deck analysis:

1. **Commander spotlight** — commander name, color identity, oracle text, key abilities. Sent first to anchor the entire analysis.
2. **Mana curve** — count cards at each CMC (0, 1, 2, 3, 4, 5, 6, 7+). Lets Gemini spot curve problems ("you have 3 one-drops and 18 five-drops").
3. **Card type distribution** — creatures / instants / sorceries / enchantments / artifacts / planeswalkers / lands. Spot imbalances ("only 2 instant-speed interaction pieces").
4. **Color pip distribution** — count colored pips across all mana costs (e.g., W:12, U:28, B:0). Reveals if the mana base supports the actual color demands.
5. **Functional categories** — tag cards by role: ramp, removal, card draw, board wipes, protection, win conditions, lands. Archidekt imports may include user-assigned categories; otherwise we infer from Scryfall types/keywords.
6. **Land count & ramp count** — critical Commander metrics surfaced explicitly.

#### System prompt structure

```
Role:     "You are an experienced Commander/EDH deck-building advisor."
Task:     "Analyze this Commander deck and provide specific, actionable
           recommendations for cuts and additions."
Context:  [pre-computed deck analysis above]
          [full Scryfall card data for every card in the deck]
Rules:
  - Only suggest cards legal in Commander and within this commander's color identity
  - Use the provided Scryfall card data as your source of truth for the current deck
  - Do not invent card names or abilities
  - Consider the user's stated power level and budget if provided
Output:   Respond in this exact JSON schema:
          { cuts: [...], additions: [...], mana_base: [...], general_notes: "..." }
          Each cut/addition: { card_name, reason, category, replaces? }
```

#### User-provided context (optional fields in UI)

These fill gaps that no API can provide:
- **Power level** — casual / focused / optimized / cEDH (dropdown)
- **Budget** — no limit / under $5 per card / under $1 per card (dropdown)
- **Strategy/theme** — free text, e.g. "voltron", "aristocrats", "storm" (input)
- **What do you want help with?** — checkboxes: cuts, additions, mana base, general advice

#### What we're honest about (limitations to show in UI)

- Gemini's training data has a cutoff — very recent sets may be underrepresented
- Meta/playgroup awareness is limited — suggestions are general best practices, not tuned to a specific pod
- Price data is daily Scryfall snapshots, not real-time market

### Hallucination defense (two layers)
1. **Input grounding** — Gemini receives real Scryfall card data (oracle text, types, mana costs, color identity), not just card names. System instruction: *"Use the provided card data as your source of truth. Do not invent card names or abilities."*
2. **Output validation** — Every card Gemini recommends is resolved against Scryfall `/cards/collection` before reaching the client. Unresolvable cards are silently dropped.

**Cost:** ~2 extra Scryfall batch requests per recommendation (1-2 in for a 100-card deck, 1-2 out for suggestions). Negligible at 10 req/sec.

### Page structure
```
app/
├── layout.tsx              # Root layout, dark theme, fonts
├── page.tsx                # Main app (single-page for now)
├── api/
│   └── recommend/
│       └── route.ts        # POST endpoint → Gemini + Scryfall
├── components/
│   ├── ui/                 # shadcn components
│   ├── decklist-input.tsx  # Textarea + URL detection + format handling
│   ├── card-grid.tsx       # Display recommendations
│   ├── card-preview.tsx    # Individual card w/ Scryfall image
│   └── recommendation.tsx  # Single recommendation with reasoning
├── lib/
│   ├── scryfall.ts         # Scryfall API client
│   ├── gemini.ts           # Gemini API client + prompt builder
│   ├── ratelimit.ts        # Upstash rate limiter
│   ├── decklist-parser.ts  # Parse text decklists
│   ├── archidekt.ts        # Fetch + parse Archidekt deck by URL/ID
│   └── validators.ts       # Input/output validation + SSRF guard
```

---

## 4. Security (Public Repo Checklist)

### API Keys
- `GEMINI_API_KEY` in `.env.local` (already gitignored) + Vercel Dashboard
- **Never** use `NEXT_PUBLIC_` prefix for secrets
- Restrict key in Google Cloud Console to Gemini API only
- Create `.env.example` documenting required vars (no values)

### Rate Limiting
- **Upstash Redis + @upstash/ratelimit**
- Per-IP: 5 requests / 60 seconds (sliding window)
- Global daily cap: 500 requests/day (hard stop)
- Client-side: disable submit button during request + cooldown

### Input Sanitization
- Max 10,000 chars
- Strip HTML tags
- Validate line format (Nx Card Name pattern)
- Log suspicious input, don't silently reject (unusual card names exist)

### Prompt Injection Defense
- Separate system instruction from user content (Gemini's `systemInstruction` param)
- Wrap decklist in `<USER_DECKLIST>` delimiters
- Constrain output to MTG domain only
- No function calling / tool use on the Gemini call
- Validate LLM output before returning to client

### Cost Protection
- Google Cloud daily quota cap (500 req/day)
- Budget alerts at 50%, 80%, 100% of monthly threshold
- Application-level global daily counter (defense in depth)

### Headers (next.config.ts)
- CSP: restrict `img-src` to self + Scryfall CDN, `connect-src` to self + APIs
- X-Frame-Options: DENY
- HSTS, nosniff, referrer-policy, permissions-policy

### Git Security
- `.env*` already in `.gitignore`
- Install `git-secrets` with Google API key pattern
- Enable GitHub Secret Scanning + Push Protection
- `.github/dependabot.yml` for weekly dependency updates

---

## 5. Decklist Input

### Method 1: Paste text (Archidekt-style format)
```
1 Sol Ring
1 Command Tower
1 Rhystic Study
// Sideboard
1 Swords to Plowshares
```
Also handle: `1x Card Name`, section headers (`// Commander`, `// Sideboard`), `#` comments, blank lines.

### Method 2: Paste Archidekt URL
```
https://archidekt.com/decks/1234567/my_deck_name
```
- Auto-detected: if input starts with `https://archidekt.com/`, treat as URL import
- Server extracts deck ID, fetches from Archidekt API, parses into card list
- Falls back gracefully with a clear error if the deck is private or the API is down

---

## 6. Implementation Order

| Phase | What | Key Dependencies |
|-------|------|-----------------|
| **1** | Project setup: shadcn/ui init, security headers, .env.example | — |
| **2** | Decklist parser + input UI | shadcn textarea, card |
| **3** | Scryfall client + card display | Scryfall API |
| **4** | Gemini integration + /api/recommend route | Gemini API key |
| **5** | Rate limiting (Upstash) | Upstash account |
| **6** | Polish: loading states, error handling, dark theme | — |
| **7** | Git security: dependabot, git-secrets | — |

---

## 7. Decisions (Confirmed)

1. **Edge runtime** — Use `fetch()` against Gemini REST API directly (no SDK needed). Vercel env vars are encrypted at rest and injected at runtime. Smaller attack surface, faster cold starts.
2. **Streaming** — Stream Gemini responses to the client for better UX. Portfolio piece should feel polished and responsive.
3. **Commander first** — Focus on cuts, additions, and presentation for the Commander format. Simplifies prompt engineering and Scryfall queries (color identity, commander legality). Other formats can be added later.
