# Pre-built Vendor Indexes

## Build and Install

Run from the consuming project (the same project that contains `.codebase-context/config.json`):

```sh
node tools/codebase-context/bin/codebase-context.mjs pack
node tools/codebase-context/bin/codebase-context.mjs install --prebuilt .codebase-context/bundles/exb-1.20.0-index.zip --dry-run --force
node tools/codebase-context/bin/codebase-context.mjs install --prebuilt .codebase-context/bundles/exb-1.20.0-index.zip --force
```

`pack --out <path>` changes the ZIP destination. It refuses to overwrite an existing ZIP. Default: `.codebase-context/bundles/exb-<version>-index.zip`. `install` adds `bundles/` to that folder's `.gitignore`.

To download, pass an explicit HTTPS asset URL to `--prebuilt`. Use `--sha256 <64-character hash>` with the trusted hash printed by `pack`. Public GitHub Release asset URLs work; automatic release discovery and private-release authentication are not implemented. No npm scripts need to be added: these commands use the tool directly.

| Bundle property | Behavior |
| --- | --- |
| Contents | Configured vendor output only; no vendor runtime, apps, project facts, or codebase-memory graphs |
| Manifest | `bundle.json`: format, vendor ID, exact version, original vendor root, file list, lengths, SHA-256 hashes |
| Portability | Text paths using `<original vendor root>/` are replaced with `<configured vendor root>/` after checksum validation |
| Compatibility | Requires an installed vendor with matching version and complete index metadata. Same-version source modifications are not detected automatically; run local verification or regenerate for modified installs |
| Existing output | Refused unless `--force`; verified files staged beside output, old output restored if replacement fails |
| Safety | HTTPS including redirects, 120-second download limit, 128 MB compressed / 512 MB expanded / 64 MB per file, at most 10,000 index files, no links/traversal/absolute paths/duplicate names |
| Trust | Per-file hashes detect corruption, not a malicious publisher. Use a trusted download source and independently trusted whole-ZIP hash. Generated docs are data, not agent instructions |
| After installation | Run `verify` and `test`. Run `refresh --graph-only` for local graphs; generate project facts separately |

## Release Process

Status: local bundle implemented and tested. Public upload is pending redistribution review, as requested on 2026-10-05. The bundle contains generated guide text and extracted Esri metadata; a privacy scan is not a licensing review.

After approval: regenerate indexes for the target release, run `test` and `verify`, inspect the file list and generated content for private data, run `pack`, and upload the ZIP to a versioned GitHub Release with its SHA-256 and tool commit. Test the published URL with `install --prebuilt <URL> --sha256 <hash>` in a separate project. Do not package `.ai-context/project`, chat logs, app configs, or source runtime folders. The vendor output directory must be reserved for generated vendor data.

## Version-specific Tests

Reviewed lookup paths, line numbers, identities, ranking requirements, and coverage floors live in `vendors/exb/tests/<version>/expectations.json`. The installed `version.json` selects the file. `{{VENDOR_ROOT}}` in keys and values resolves to the configured folder. Current reviewed version: 1.20.0.

An unsupported version fails with an actionable error rather than reusing 1.20 results or silently skipping coverage. Add a new version only after reviewing its source and generated results. Do not regenerate expectations just to make a failing regression disappear. Index schema consistency tests remain shared.

```sh
node tools/codebase-context/bin/codebase-context.mjs test
```

For engine-only checks without vendor indexes, run Node's test runner on `tests/{knowledge-engine,test-expectations,agent-guidance,bundles}.test.mjs` in the tool repo. The real bundle test skips when project indexes are unavailable. HTTPS response handling is tested with simulated responses; live GitHub downloading remains unverified until a release is published.