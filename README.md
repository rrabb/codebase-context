# codebase-context

Builds searchable indexes, checked facts, and plain-text docs for large vendor codebases that AI models were not trained on, so agents can answer from the installed source instead of memory. The first vendor package is ArcGIS Experience Builder (`vendors/exb/`).

Repo: https://github.com/rrabb/codebase-context

> [!IMPORTANT]
> **The ExB vendor folder must be named `ArcGISExperienceBuilder`, at the project root.** Index paths, generated instructions, skills, and pre-built bundles all start with that name, and `install --prebuilt` refuses a bundle built for a different folder name. Supporting other names is a low-priority wishlist item (see [docs/roadmap.md](docs/roadmap.md)).

## Use from a project

1. `npm install` in this folder.
2. Link it into the project: `New-Item -ItemType Junction -Path <project>\tools\codebase-context -Target C:\_DEV\codebase-context`.
3. Add `<project>/.codebase-context/config.json` (vendor root and output folder per vendor; `targets`: which agent tools to install for; optional project facts). `codebase-context init --exb ArcGISExperienceBuilder` writes one.

| Target | Skills folder | Other files |
| --- | --- | --- |
| `copilot` (default) | `.github/skills/` (or `.claude/skills/` / `.agents/skills/` when combined with another target; Copilot reads all three) | `.github/instructions/`, `.github/prompts/`, `AGENTS.md` block |
| `claude` | `.claude/skills/` | `AGENTS.md` block, `CLAUDE.md` with `@AGENTS.md` |
| `codex` | `.agents/skills/` | `AGENTS.md` block |
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
| `install [--dry-run] [--force] [--targets copilot,claude,codex]` | Link the vendor skills into each target's skills folder, write the generated ExB block at the top of `AGENTS.md`, and (for Copilot) write the instructions and prompts from templates. Targets default to `"targets"` in `config.json`, then `copilot`. With `claude`, also creates `CLAUDE.md` containing `@AGENTS.md`. Adds the linked skill folders to `.gitignore`. `--force` backs up hand-made or hand-edited files to `.codebase-context/backup/` first. |
| `pack [--vendor exb] [--out <zip>]` | Pack the configured vendor indexes with version metadata and per-file SHA-256 hashes. |
| `install --prebuilt <zip or HTTPS URL> [--sha256 <hash>] [--replace-index]` | Validate a bundle that matches the installed ExB version and vendor folder name, install it, then install guidance. A URL requires `--sha256`. An existing index requires `--replace-index` (`--force` does not replace it); `--dry-run` validates without writing. |
| `test` | Tests against the project's indexes |

Outputs go to the project's `.ai-context/`. Details: [docs/ai-index.md](docs/ai-index.md), [docs/EXB-API-USAGE-INDEX-SPEC.md](docs/EXB-API-USAGE-INDEX-SPEC.md).

## Status

The engine, ExB skills, templates, and version-specific test expectations live here. Vendor folders come from project config. Pre-built vendor indexes can be packed and installed without running generators; graphs and project facts remain local. Public bundle upload awaits a redistribution review. Generalizing the remaining ExB-specific indexing rules and adding an MCP server are deferred.

See [docs/prebuilt-indexes.md](docs/prebuilt-indexes.md) for bundles and versioned tests, and [docs/mcp-design.md](docs/mcp-design.md) for the deferred server proposal. No MCP server is implemented.
