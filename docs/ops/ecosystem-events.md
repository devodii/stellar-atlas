# Ecosystem Events

Datasets about events such as hackathons, imported into Postgres and served by
the public API. The first dataset is HackMeridian 2026, produced by
[HackProof](https://github.com/devodii/hackproof).

## Why this is separate from the chain data

StellarAtlas monitors the public network. HackMeridian ran on testnet, so its
contract ids, accounts and wasm uploads do not exist in the explorer tables.
Event data is therefore a read model of its own, keyed by GitHub repository.
That is also how it connects to the explorer: contract build provenance reports
the `sourceRepository` embedded in a contract's wasm, and
`GET /v1/repositories/{owner}/{repo}/ecosystem-events` says which events that
repository took part in.

## Dataset format

A dataset is one directory per event:

```text
2026/
  _event.yml        manifest: slug, name, network, starts_at, ends_at, source_url
  nest.yml          one file per project, named by the project
  private-yield.yml
```

The manifest names the event and the Stellar network it ran on (`pubnet`,
`testnet` or `futurenet`). A project file holds the repository (as
`canonical_id: pkg:github/<owner>/<repo>`), track, award, evidence tier, chain
counts and evidence, integration evidence, stack and public contributor handles.
HackProof publishes both JSON Schemas next to the data (`schema-event.yml`,
`schema-hackathon-project.yml`) and generates the files, so they are never
edited by hand.

Meanings:

- `evidence_tier`: `verified` means the repository references an account,
  contract or asset that was active on chain during the event. `likely` means a
  repository that looks like a submission with no on-chain proof.
- `track` / `track_declared`: `track_declared` is true only when the team states
  its track itself. Otherwise `track` is the default `genesis`, an assumption.
- `contract_count` and the chain fields describe the event's network.

## Importing

```sh
pnpm --filter backend run migrations -- --apply   # once, creates the tables

# validate the files only, no database
pnpm --filter backend run import-ecosystem-event -- --directory ../hackproof/data/2026 --check
# compare with the database, write nothing
pnpm --filter backend run import-ecosystem-event -- --directory ../hackproof/data/2026 --dry-run
# import
pnpm --filter backend run import-ecosystem-event -- --directory ../hackproof/data/2026
```

The import is idempotent. Every dataset gets a revision (a SHA-256 of its
canonical content), and importing the same revision again changes nothing and
reports `unchanged`. A changed dataset replaces the event's projects in one
transaction, so readers never see a half-imported event. Invalid datasets are
rejected as a whole and every problem is listed with its file and field.

## Adding a hackathon

Nothing in the code is specific to HackMeridian. For the next event, generate
its directory with the same producer, check it, and import it:

```sh
pnpm --filter backend run import-ecosystem-event -- --directory <dir> --check
pnpm --filter backend run import-ecosystem-event -- --directory <dir>
```

The API lists the new event with no deploy.

## API

| Operation                       | Path                                                      |
| ------------------------------- | --------------------------------------------------------- |
| `listEcosystemEvents`           | `GET /v1/ecosystem-events`                                |
| `getEcosystemEvent`             | `GET /v1/ecosystem-events/{slug}`                         |
| `listEcosystemEventProjects`    | `GET /v1/ecosystem-events/{slug}/projects`                |
| `getEcosystemEventProject`      | `GET /v1/ecosystem-events/{slug}/projects/{owner}/{repo}` |
| `listRepositoryEcosystemEvents` | `GET /v1/repositories/{owner}/{repo}/ecosystem-events`    |

The project list is ordered winners first, then runner-ups, then by name, and
pages with `nextCursor`. Filters: `track`, `tier`, `award` (`first`,
`runner-up`, `any`), `integration` (a partner slug) and `q` (name, repository or
description). Responses are cacheable for five minutes because data only changes
on import.

## Storage

- `ecosystem_events`: one row per event, with its summary and revision.
- `ecosystem_event_projects`: one row per project, removed with its event.

Both are rebuildable from the dataset files, which stay the source of truth.
