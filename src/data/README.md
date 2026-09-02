# Test data

Static fixtures live here; anything unique per run should be generated at
runtime with `generateUser()` / `uniqueId()` from `@utils/data.utils` so
parallel workers never collide on the same record.

| File         | Purpose                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| `users.json` | Role definitions and expected permissions (no credentials — those come from the environment). |
| `files/`     | Sample upload payloads. Generate size-boundary files at runtime with `createFileOfSize()`.    |

Never commit real credentials or production data. Credentials come from
`.env` / CI secrets and are read through `getUser(role)`.
