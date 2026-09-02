/** Documentation for root-level configuration files. */
export default {
  'playwright.config.ts': {
    group: 'root',
    title: 'Playwright configuration',
    purpose:
      'The single entry point Playwright reads before anything else runs. It declares the browser projects, timeouts, artifact policy, reporters and global hooks. It contains no environment values of its own: everything variable is imported from `src/config/env.config.ts`, which has already validated it.',
    blocks: [
      {
        type: 'code',
        caption: 'The shape of the file',
        text: `const reporters: ReporterDescription[] = [ /* list, html, junit, json, summary, ctrf */ ];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: config.workers ?? (config.isCI ? '50%' : undefined),
  retries: config.retries,
  timeout: config.timeouts.test,
  forbidOnly: config.isCI,
  expect: { timeout: config.timeouts.expect, toHaveScreenshot: { /* ... */ } },
  globalSetup: './src/hooks/global.setup.ts',
  globalTeardown: './src/hooks/global.teardown.ts',
  use: { baseURL: config.baseURL, trace: config.artifacts.trace, testIdAttribute: 'data-testid' /* ... */ },
  projects: [ /* setup, chromium, firefox, webkit, edge, mobile, tablet, visual, accessibility, dark-mode */ ],
  reporter: reporters,
});`,
      },
    ],
    changeWhen: [
      'You add a browser, device profile or a new specialised suite (for example a `performance` or `smoke-only` project).',
      'You need a different default timeout, retry count or worker count for the whole suite.',
      'You want to add or remove a reporter.',
      'The application under test must be started by the test run itself (uncomment the `webServer` block).',
      'You change where snapshots or artifacts are written.',
    ],
    changeHow: [
      {
        text: "To add a browser or device project, copy an existing entry and give it a unique `name`. Keep `dependencies: ['setup']` so it inherits authenticated sessions, and keep the `testIgnore` for the specialised folders so visual and a11y specs do not run in every browser.",
        code: `{
  name: 'galaxy-s23',
  use: { ...devices['Galaxy S9+'] },
  dependencies: ['setup'],
  testIgnore: ['**/visual/**', '**/a11y/**'],
},`,
      },
      {
        text: 'To change a timeout, do NOT hard-code a number here. Change the named budget in `src/config/timeouts.ts` or the environment variable it reads, so every wait in the framework moves together.',
      },
      {
        text: 'To start the app under test with the suite, uncomment the `webServer` block at the bottom and point `command` at your dev server script.',
        code: `webServer: {
  command: 'npm run start',
  url: config.baseURL,
  reuseExistingServer: !config.isCI,
  timeout: 120_000,
},`,
      },
      {
        text: 'To add a reporter, push it onto the `reporters` array before `defineConfig` runs. Guard CI-only or opt-in reporters with a condition so local runs stay fast.',
        code: `if (config.allureEnabled) {
  reporters.push(['allure-playwright', { resultsDir: 'reports/allure-results' }]);
}`,
      },
    ],
    why: 'Playwright resolves this file once, in the parent process, before workers exist. Anything decided here applies to the entire run and cannot be overridden per test, which is exactly why environment resolution happens in `env.config.ts` first: by the time this file executes, configuration is already validated and typed.',
    gotchas: [
      "Adding a project without `dependencies: ['setup']` means its tests start signed out.",
      'The `visual` project is deliberately pinned to one browser and viewport; running visual specs elsewhere produces meaningless diffs.',
      'Passing `--reporter=...` on the command line replaces the whole reporter list, so `reports/summary.json` is not written on those runs.',
    ],
    related: ['src/config/env.config.ts', 'src/config/timeouts.ts', 'src/hooks/global.setup.ts'],
  },

  'tsconfig.json': {
    group: 'root',
    title: 'TypeScript configuration',
    purpose:
      'Compiler settings and path aliases for the whole repository. Strict mode is on in full, including `noUncheckedIndexedAccess`, so array and record access must be handled rather than assumed.',
    blocks: [
      {
        type: 'table',
        head: ['Setting', 'Value', 'Why'],
        rows: [
          [
            '`strict` + `noUncheckedIndexedAccess`',
            'true',
            'A test framework that lies about types produces failures nobody can diagnose.',
          ],
          [
            '`module` / `moduleResolution`',
            '`ESNext` / `Bundler`',
            'Lets source use extensionless imports, which Playwright resolves at runtime.',
          ],
          [
            '`noEmit` (via script)',
            'typecheck only',
            'Playwright transpiles at runtime; the repo never ships compiled JS.',
          ],
          [
            '`paths`',
            '`@core/*`, `@components/*`, …',
            'Import by role rather than by relative depth.',
          ],
        ],
      },
    ],
    changeWhen: [
      'You add a new top-level folder under `src/` that deserves its own alias.',
      'You need to loosen or tighten a compiler check for the whole repo.',
      'You upgrade TypeScript and a new flag becomes relevant.',
    ],
    changeHow: [
      {
        text: 'To add an alias, add it to `paths` and use it immediately; both `tsc` and Playwright read this file, so no second registration is needed.',
        code: `"paths": {
  "@core/*": ["./src/core/*"],
  "@flows/*": ["./src/flows/*"]
}`,
      },
      {
        text: 'Never disable `strict` to make an error go away. Fix the type, or narrow with a documented guard.',
      },
    ],
    why: 'Aliases and strictness are repo-wide contracts. Changing them in one place keeps editor, `npm run typecheck` and the Playwright runtime in agreement; a local override in one file would drift.',
    gotchas: [
      '`baseUrl` is deliberately absent: TypeScript 6 deprecates it, and `paths` alone resolves relative to this file.',
    ],
    related: ['package.json', 'eslint.config.mjs'],
  },

  'package.json': {
    group: 'root',
    title: 'Package manifest and scripts',
    purpose:
      'Declares dependencies, the Node engine range, the lint-staged rules and every command the team runs. The scripts are the documented interface to the framework: if a task is worth doing twice, it belongs here rather than in someone’s shell history.',
    blocks: [
      {
        type: 'table',
        head: ['Script group', 'Scripts', 'Purpose'],
        rows: [
          [
            'Run',
            '`test`, `test:headed`, `test:ui`, `test:debug`',
            'Everyday execution and debugging.',
          ],
          [
            'Slice',
            '`test:chromium`, `test:firefox`, `test:webkit`, `test:mobile`, `test:smoke`, `test:regression`, `test:failed`',
            'Run a subset by browser or tag.',
          ],
          [
            'Specialised',
            '`test:a11y`, `test:visual`, `test:visual:update`',
            'Accessibility and screenshot suites.',
          ],
          ['Report', '`report`, `report:allure`', 'Open generated reports.'],
          [
            'Quality',
            '`typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `validate`',
            'Everything CI enforces, runnable locally.',
          ],
          [
            'Housekeeping',
            '`clean`, `install:browsers`, `codegen`, `prepare`',
            'Environment maintenance.',
          ],
          ['Docs', '`docs`, `docs:api`, `docs:html`, `docs:pdf`', 'Regenerate this documentation.'],
        ],
      },
    ],
    changeWhen: [
      'You add a dependency, or remove one that is no longer imported anywhere.',
      'A team workflow needs a name (a new tag suite, a new environment shortcut).',
      'The supported Node range changes.',
    ],
    changeHow: [
      {
        text: 'Add a script named after the intent, not the flags, so it reads well in CI logs and in `make help`.',
        code: `"test:checkout": "playwright test tests/ui/checkout --project=chromium",
"test:staging": "cross-env TEST_ENV=staging playwright test"`,
      },
      {
        text: 'Install dependencies as devDependencies. Nothing here ships to production, and a stray runtime dependency confuses vulnerability scanners.',
        code: `npm install --save-dev <package>`,
      },
    ],
    why: 'Scripts are the contract between humans, the Makefile and CI. The GitHub workflow calls the same commands you run locally, so a green local `npm run validate` means a green CI lint job.',
    gotchas: [
      '`zod` is pinned to v3 on purpose: v4’s CommonJS build fails to initialise under the transform Playwright applies to config files.',
      'There is no `"type": "module"` field. Playwright transpiles TypeScript to CommonJS, which keeps every CommonJS-only dependency interoperable.',
    ],
    related: ['Makefile', '.github/workflows/playwright.yml'],
  },

  'eslint.config.mjs': {
    group: 'root',
    title: 'ESLint flat configuration',
    purpose:
      'Type-aware linting for the whole repository. It layers the JavaScript recommended rules, `typescript-eslint` type-checked rules, Playwright-specific rules for test files, and Prettier last so formatting never fights the linter.',
    blocks: [
      {
        type: 'ul',
        items: [
          '`no-floating-promises` and `no-misused-promises` are errors — an un-awaited Playwright call is the single most common source of phantom passes.',
          '`consistent-type-imports` keeps type-only imports out of the runtime bundle.',
          '`explicit-function-return-type` is a warning, and `--max-warnings=0` in the `lint` script promotes it to a build failure.',
          'Test files additionally get `eslint-plugin-playwright`; `expect-expect` is disabled because assertions often live inside page objects and components.',
          '`.mjs` and `.js` files opt out of type-aware rules, since they are not part of the TypeScript program.',
        ],
      },
    ],
    changeWhen: [
      'A rule produces repeated false positives across the codebase.',
      'You add a new file category that needs different rules (for example a scripts folder that may use `console`).',
      'You adopt a new plugin.',
    ],
    changeHow: [
      {
        text: 'Add a scoped block rather than weakening a rule globally. Order matters — later blocks win, and `prettier` must stay last.',
        code: `{
  files: ['src/reporters/**/*.ts', 'scripts/**/*.ts'],
  rules: { 'no-console': 'off' },
},`,
      },
      {
        text: 'For a one-off exception, disable on the line and say why. An undocumented disable comment will be copied by the next person.',
        code: `// React tracks the native setter, so a direct assignment is ignored.
// eslint-disable-next-line @typescript-eslint/unbound-method
const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;`,
      },
    ],
    why: 'Lint rules encode the review comments you would otherwise write by hand every sprint. Putting the exception next to the code — with a reason — keeps the global standard strict.',
    related: ['.prettierrc.json', 'package.json'],
  },

  '.prettierrc.json': {
    group: 'root',
    title: 'Prettier options',
    purpose:
      'Formatting rules: 100-character lines, single quotes, trailing commas, two-space indentation, LF endings. Applied by `npm run format`, by the editor on save, and by the pre-commit hook.',
    changeWhen: [
      'The team agrees on a different house style. This is a taste decision, so change it once and reformat the whole repo in a single commit.',
    ],
    changeHow: [
      {
        text: 'Edit the option, then reformat everything so no future diff mixes style churn with real changes.',
        code: `npm run format && git commit -am "chore: reformat with new Prettier settings"`,
      },
    ],
    why: 'Formatting arguments waste review time. One config, applied mechanically, ends them.',
    related: ['.prettierignore', 'eslint.config.mjs'],
  },

  '.prettierignore': {
    group: 'root',
    title: 'Prettier exclusions',
    purpose:
      'Keeps Prettier away from generated and vendored output: `node_modules`, `dist`, `reports`, `test-results`, `playwright-report`, `blob-report`, `package-lock.json` and screenshot snapshot folders.',
    changeWhen: ['You add a folder of generated artifacts.'],
    changeHow: [
      {
        text: 'Append the folder. Mirror the entry in `.gitignore` if the output should also stay out of version control.',
      },
    ],
    why: 'Formatting generated files creates noisy diffs and can corrupt binary snapshots.',
    related: ['.gitignore'],
  },

  '.editorconfig': {
    group: 'root',
    title: 'Editor defaults',
    purpose:
      'Charset, indentation, final newline and trailing-whitespace rules that apply in any editor, including ones without Prettier installed.',
    changeWhen: [
      'You change indentation or line endings in Prettier and want editors to agree before formatting runs.',
    ],
    changeHow: [
      {
        text: 'Keep this file and `.prettierrc.json` consistent; if they disagree, files churn between contributors.',
      },
    ],
    why: 'It is the lowest-common-denominator agreement that works for everyone on the team regardless of tooling.',
    related: ['.prettierrc.json'],
  },

  '.nvmrc': {
    group: 'root',
    title: 'Node version pin',
    purpose:
      'Pins Node 22 (LTS). `nvm use` reads it locally and the CI workflow reads it through `node-version-file`, so local and CI runtimes match.',
    changeWhen: ['The project moves to a new Node LTS release.'],
    changeHow: [
      {
        text: 'Change the version, run a full suite locally, then let CI confirm. Update the `engines` range in `package.json` in the same commit.',
      },
    ],
    why: 'Playwright supports LTS releases. Odd-numbered Node releases regularly break tooling that depends on module-resolution behaviour, and a version pin turns that class of surprise into a deliberate upgrade.',
    related: ['package.json', '.github/workflows/playwright.yml'],
  },

  '.gitignore': {
    group: 'root',
    title: 'Version-control exclusions',
    purpose:
      'Keeps dependencies, run artifacts, saved sessions and secrets out of the repository: `node_modules`, `test-results`, `reports`, `blob-report`, `playwright/.cache`, `storage/*.json`, and every `.env` file except `.env.example`.',
    changeWhen: ['You add a new artifact directory, or a new secret-bearing file.'],
    changeHow: [
      {
        text: 'Add the pattern, and if the file was already committed, remove it from the index explicitly.',
        code: `git rm --cached path/to/file`,
      },
    ],
    why: 'Saved storage states in `storage/` are live session cookies. Committing one is equivalent to committing a password.',
    gotchas: [
      '`.env.example` is deliberately un-ignored — it is the template that documents every supported variable.',
    ],
    related: ['.env.example', 'src/config/env.config.ts'],
  },

  '.env.example': {
    group: 'root',
    title: 'Environment template',
    purpose:
      'The documented list of every variable the framework understands, with safe defaults and no real values. Copy it to `.env` to configure a local run.',
    blocks: [
      {
        type: 'table',
        head: ['Variable', 'Default', 'Effect'],
        rows: [
          ['`TEST_ENV`', '`dev`', 'Selects an entry from `src/config/environments.ts`.'],
          [
            '`BASE_URL`',
            'environment default',
            'Overrides the target URL — use for preview deployments.',
          ],
          ['`HEADLESS`', '`true`', 'Forced to true in CI regardless of this value.'],
          ['`SLOW_MO`', '`0`', 'Milliseconds of delay per action, for demos and debugging.'],
          [
            '`WORKERS` / `RETRIES`',
            'environment default',
            'Override parallelism and retry policy.',
          ],
          [
            '`TIMEOUT_ACTION/NAVIGATION/EXPECT/TEST`',
            'see `timeouts.ts`',
            'Timeout budgets in milliseconds.',
          ],
          ['`TRACE` / `VIDEO` / `SCREENSHOT`', '`retain-on-failure`', 'Artifact capture policy.'],
          ['`VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT`', '1920 x 1080', 'Default viewport.'],
          ['`LOG_LEVEL`', '`info`', '`error` | `warn` | `info` | `debug` | `trace`.'],
          [
            '`*_USER` / `*_PASSWORD`',
            'empty',
            'Credentials per role, read through `getUser(role)`.',
          ],
          [
            '`API_BASE_URL` / `API_TOKEN`',
            'environment default',
            'Used by the API client for seeding data.',
          ],
          ['`ALLURE_ENABLED`', '`false`', 'Adds the Allure reporter to the run.'],
        ],
      },
    ],
    changeWhen: [
      'You add a variable to the zod schema in `env.config.ts`. The two must always be updated together.',
    ],
    changeHow: [
      {
        text: 'Add the variable to the schema first, then document it here with a safe placeholder value and a comment describing its effect.',
        code: `# Feature flag overrides applied before every test
FEATURE_FLAGS=`,
      },
    ],
    why: 'This file is the only discoverable inventory of what the framework can be configured with. An undocumented variable is one that nobody outside its author can use.',
    gotchas: ['Never put a real credential here — the file is committed.'],
    related: ['src/config/env.config.ts', '.env'],
  },

  '.env': {
    group: 'root',
    title: 'Local environment values (not committed)',
    purpose:
      'Your machine-local configuration, created by copying `.env.example`. It is git-ignored. `env.config.ts` loads it first, then `.env.<TEST_ENV>` on top, and real process variables win over both so CI secrets are never overwritten.',
    changeWhen: [
      'You point your machine at a different environment, enable debugging, or set local credentials.',
    ],
    changeHow: [
      {
        text: 'Copy the template and edit. For a one-off run, prefer an inline variable so your file stays clean.',
        code: `cp .env.example .env
BASE_URL=https://pr-451.preview.example.com npm run test:smoke`,
      },
    ],
    why: 'Keeping machine-specific values out of the repository is what lets ten engineers point the same suite at ten different environments without conflict.',
    related: ['.env.example', 'src/config/env.config.ts'],
  },
};
