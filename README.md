# MTG Decklist Recommendations

An AI-powered Commander/EDH deck analysis tool that suggests cuts, additions, and mana base improvements for your Magic: The Gathering decklists.

## About This Project

This is an AI-assisted side project — the entire codebase is built collaboratively with AI tooling to explore and showcase what modern AI-assisted development looks like in practice. The planning, architecture decisions, and implementation are documented in [`documents/PLAN.md`](documents/PLAN.md).

## Architecture — Micro-Frontend Zone

This app is deployed as an **independent micro-frontend** composed into a portfolio shell via [Vercel Microfrontends](https://vercel.com/docs/workflow-collaboration/microfrontends). Both projects belong to the same Vercel Microfrontends group — Vercel handles routing at the edge, no manual rewrites needed.

```
Portfolio Shell (dbedford.dev)
├── /                  ← portfolio routes
├── /blog/*            ← blog routes
├── /projects/*        ← project write-ups
└── /mtg-rag/*         ← routed to this app by Vercel
```

This pattern means:
- **Independently deployable** — this app has its own CI/CD, env vars, and release cycle
- **Self-contained** — all API routes, components, and state live in this repo
- **Composable** — new project MFEs join the group with zero code changes to the shell

The `basePath: '/mtg-rag'` in `next.config.ts` ensures all routes, assets, and API calls work correctly under the portfolio's path prefix.

## What It Does

1. **Paste a decklist** (Archidekt-style text format) or an **Archidekt URL** for a public deck
2. Optionally set your **power level**, **budget**, and **strategy/theme**
3. Get back actionable recommendations: cards to cut, cards to add, mana base fixes, and general deck-building advice — each with reasoning

Under the hood, every card is resolved against the [Scryfall API](https://scryfall.com/docs/api) for verified oracle text, mana costs, and color identity. This grounded data is sent to Gemini Flash, which acts as a Commander deck-building advisor. Recommendations are validated back against Scryfall before reaching you — hallucinated card names are dropped automatically.

## Tech Stack

- **Next.js 16** (App Router, Edge Runtime)
- **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Scryfall API** — card data, images, pricing, legality
- **Gemini 2.0 Flash** — deck analysis and recommendations (server-side only)
- **Upstash Redis** — rate limiting
- **Vercel Microfrontends** — edge-routed composition with the portfolio shell

## Getting Started

```bash
npm install
cp .env.example .env.local  # then fill in your API keys
npm run dev
```

Open [http://localhost:3000/mtg-rag](http://localhost:3000/mtg-rag).

> **Note:** The `basePath: '/mtg-rag'` in `next.config.ts` means all routes are prefixed. This is required for the portfolio integration. If you want to run this app standalone at `localhost:3000/`, comment out the `basePath` line in `next.config.ts`.

## Environment Variables

See [`.env.example`](.env.example) for required configuration.

## License

MIT
