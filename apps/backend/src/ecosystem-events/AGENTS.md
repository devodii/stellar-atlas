# Ecosystem Events Agent Guide

Read `../../../../AGENTS.md` and `../../AGENTS.md` first. `ecosystem-events`
stores imported datasets about events such as hackathons: which GitHub
repositories took part, in which track, with which award, and what on-chain and
integration evidence tied each one to the Stellar network. Full runbook:
`docs/ops/ecosystem-events.md`.

## Purpose

StellarAtlas monitors the public network. An event can run on another network
(HackMeridian 2026 ran on testnet), so this feature never joins event data to
the chain tables. The join key is the GitHub repository, which is also what
contract build provenance reports as `sourceRepository`.

## Code Map

- `domain` holds the DTOs, repository ports, and the pure rules: summaries, the
  dataset revision hash, and the project listing cursor.
- `infrastructure/dataset` reads and validates a dataset directory.
- `infrastructure/database` holds the entities, the migration, and the TypeORM
  repository. Imports replace an event's projects in one transaction.
- `infrastructure/cli` has the `import-ecosystem-event` command.
- `infrastructure/http` exposes `/v1/ecosystem-events` and
  `/v1/repositories/{owner}/{repo}/ecosystem-events`.

## Working Rules

- Event data is imported, never scraped. Do not add network access to the
  importer. A run must be repeatable: the same files give the same revision and
  an `unchanged` outcome.
- Validate strictly. Unknown keys, invalid links and mismatched ids fail the
  whole import with every problem listed, so bad data never reaches the API.
- Keep the schema in step with the producer. The dataset format is defined by
  its generator (HackProof); see the runbook for the contract.
- Never mix networks. An event records its network, and chain identifiers in its
  projects belong to that network, not to the one StellarAtlas monitors.
- Listing is keyset paginated on `(award_rank, slug)`. Keep that index and the
  ordering in step when adding filters.
- New public operations need an entry in `PublicOpenApiOperationPolicy.ts`.

## Verification

- Unit: `pnpm test:unit:backend -- ecosystem-events`
- Integration needs `DATABASE_TEST_URL`:
  `pnpm test:integration:backend -- ecosystem-events`
