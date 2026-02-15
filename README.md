# MTG Decklist Recommendations

An AI-powered Commander/EDH deck analysis tool that suggests cuts, additions, and mana base improvements for your Magic: The Gathering decklists.

## About This Project

This is an AI-assisted side project — the entire codebase is built collaboratively with AI tooling to explore and showcase what modern AI-assisted development looks like in practice. The planning, architecture decisions, and implementation are documented in [`documents/PLAN.md`](documents/PLAN.md).

## What It Does

1. **Paste a decklist** (Archidekt-style text format) or an **Archidekt URL** for a public deck
2. Optionally set your **power level**, **budget**, and **strategy/theme**
3. Get back actionable recommendations: cards to cut, cards to add, mana base fixes, and general deck-building advice — each with reasoning

Under the hood, every card is resolved against the [Scryfall API](https://scryfall.com/docs/api) for verified oracle text, mana costs, and color identity. This grounded data is sent to Gemini Flash, which acts as a Commander deck-building advisor. Recommendations are validated back against Scryfall before reaching you — hallucinated card names are dropped automatically.

## Tech Stack

- **Next.js** (App Router, Edge Runtime)
- **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Scryfall API** — card data, images, pricing, legality
- **Gemini 2.0 Flash** — deck analysis and recommendations (server-side only)
- **Upstash Redis** — rate limiting

## Getting Started

```bash
npm install
cp .env.example .env.local  # then fill in your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See [`.env.example`](.env.example) for required configuration.

## License

MIT
