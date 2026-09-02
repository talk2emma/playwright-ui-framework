# Static test data

Files here are checked into the repository, so everything in this folder must be
safe to make public.

| File          | Format     | Read by                                   | Purpose                                                            |
| ------------- | ---------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `personas.ts` | TypeScript | `auth.setup.ts`, `bank.fixture.ts`, specs | The SecureBank demo accounts and the seeded facts tests assert on. |

## Why there is so little here

An earlier version of this folder carried a JSON user table, a CSV case matrix
and a sample upload, together with `readJson`, `readCsv` and `readExcel` helpers
in `src/utils/file.utils.ts` to read them. Nothing ever did. The helpers and the
files were removed together.

The lesson is worth keeping: add a data file when a test reads it, in the same
change as the test. Fixtures added in advance of a need are indistinguishable
from fixtures nobody needs.

Note that `personas.ts` is TypeScript rather than JSON on purpose — the compiler
checks that a spec asking for `PERSONAS.frozen` gets a persona that exists.
