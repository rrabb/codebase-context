# codebase-context

Builds searchable indexes, checked facts, and plain-text docs for large vendor codebases that AI models were not trained on, so agents can answer from the installed source instead of memory. The first vendor package is ArcGIS Experience Builder (`vendors/exb/`).

Repo: https://github.com/rrabb/codebase-context

## Use from a project

1. `npm install` in this folder.
2. Link it into the project: `New-Item -ItemType Junction -Path <project>\tools\codebase-context -Target C:\_DEV\codebase-context`.
3. Add `<project>/.codebase-context/config.json` (vendor root and output folder per vendor; optional project facts).
4. Run `node tools/codebase-context/bin/codebase-context.mjs <command> --project <project>`. Without `--project`, the current folder is used.

| Command | Builds or does |
| --- | --- |
| `index` | Fast source indexes, `REPOSITORY-MAP.md`, `CLIENT-RUNTIME-MAP.md` |
| `index:docs` | Local docs and Storybook route index |
| `index:rich` | Type-accurate widget index and API catalog (ts-morph) |
| `index:usages` | Compiler-resolved API usages |
| `knowledge [facts\|docs\|all]` | Versioned facts (`facts/<version>.json`, change report) and guide text (`docs-text/`) |
| `find <term>` | Look up an API, member, or capability |
| `verify` | Index version and coverage checks |
| `refresh` | codebase-memory graphs, then `index`, then `knowledge` |
| `combine-dts <in> <out>` | Combine a folder of `.d.ts` files |
| `install [--dry-run] [--force]` | Link the vendor skills into `.github/skills/` and write the instructions and prompts from templates (project graph names and vendor root filled in). `--force` backs up hand-made files to `.codebase-context/backup/` first. |
| `test` | Tests against the project's indexes |

Outputs go to the project's `.ai-context/`. Details: [docs/ai-index.md](docs/ai-index.md), [docs/EXB-API-USAGE-INDEX-SPEC.md](docs/EXB-API-USAGE-INDEX-SPEC.md).

## Status

Phase 1: the engine runs outside the project. The indexers still contain ExB paths; moving them into `vendors/exb/` is phase 2. Skills, instructions, and prompts move here in phase 3.
