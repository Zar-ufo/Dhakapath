# DhakaPath judge data

This folder contains the supplied project sources used during the demo:

- `transit_routes.csv` — authoritative route, fare, eligibility, and verification records used by the app.
- `map-data/` — extracted contents of the supplied `Map Data.zip`.
- `sources/INIF-2026-problem-statement.pdf` — official challenge brief.
- `sources/Map-Data-original.zip` — original supplied archive for audit/reference.

The application does not claim that these files are live feeds. The route CSV records retain their own source and verification fields. Street alerts are user-submitted during a run.

For the judgement demo, start from the repository root with `npm run dev`; the app reads its compiled CSV-backed route model while these source files remain available to show provenance.
