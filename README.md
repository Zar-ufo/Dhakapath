# DhakaPath

DhakaPath is a local-first Smart City prototype for the INIF 2026 hackathon. It models a seeded Dhaka transit graph, multimodal fares, disruption rerouting, validated crowd reports, and English/Banglish commute queries.

## Run locally

```bash
npm install
npm run dev
```

The production checks are:

```bash
npm test
npm run build
```

## What is implemented

- 23 CSV-sourced Dhaka hubs and 131 directed bus and MRT-6 links from `data/transit_routes.csv`; four CSV rows explicitly marked `synthetic_demo_data` are excluded from runtime. Their original CSV records remain available for audit.
- Dijkstra graph routing with transfer waits, route grounding, and scenario-aware costs.
- Student fare behavior is explicit: all bus legs are charged at 50% of the regular fare with a BDT 10 floor; metro, leguna, and rickshaw legs receive no student discount. Rain may add a separate rickshaw surge.
- Clear, rain, rush-hour, and blocked-segment simulations recalculate the route and show fare breakdowns.
- Crowd reports support corroboration, resolution, staleness after 24 hours, and basic sanity checks.
- Deterministic English/Banglish parsing supports follow-up questions, budget warnings, rain, and avoid/blocked requests without an AI key.
- Optional server-side Gemini Trip Intelligence is available through `/api/trip-intelligence`. Gemini receives grounded local graph facts and must not invent routes or live conditions.
- The UI provides grounded alternative routes, map auto-fitting, boarding landmarks and wait times, active/history alert filtering, real report submission fields, corroboration/resolution actions, persistent dark mode, and one-button AI sending.
- The header language control switches core labels between English and Bangla, while the route voice button uses the browser Web Speech API to announce the selected origin, destination, duration, and fare in English or Bangla.
- Metro-related hub popups include verified DMTCL visitor information from the official Metro Rail Exhibition & Information Center page, with clickable phone/email links and source attribution. The DMTCL page does not publish station-specific phone numbers, so the popup does not invent them.

The app uses Leaflet with OpenStreetMap tiles; no paid map service or map API key is required. Transit links and fares are sourced from the included CSV and retain each record's verification/source notes. Street alerts start empty and are user-submitted; they are not claimed to be live.

## Architecture

- `src/data.ts`: shared TypeScript interfaces and generated CSV-backed hubs/segments.
- `data/transit_routes.csv`: authoritative route, fare, eligibility, verification, and source records supplied for the prototype.
- `src/routing.ts`: graph search and fare rules.
- `src/reports.ts`: report validation and lifecycle.
- `src/conversation.ts`: deterministic conversational fallback.
- `src/App.tsx`: presentation layer and scenario controls.

No authentication, database server, paid API, or browser-exposed API key is required.

## Gemini deployment setup

Gemini is optional. For Netlify production, add `GEMINI_API_KEY` in the site
environment variables with scope set to production, and optionally add
`GEMINI_MODEL` with a supported Gemini model name. Never commit these values or
put them in a `VITE_` variable. Netlify invokes the server-side function in
`netlify/functions/trip-intelligence.ts`; the key is never sent to the browser.

For local development, set the same variables in an untracked `.env.local` file
and restart `npm run dev`. If the key is absent or Gemini fails, the local
deterministic assistant remains available.

The key previously pasted into chat must be revoked and replaced in Google AI
Studio before deployment. Treat it as compromised.
