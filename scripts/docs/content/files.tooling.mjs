/** Documentation for CI, containers, editor and docs tooling. */
export default {
  '.github/workflows/playwright.yml': {
    group: 'tooling',
    title: 'Continuous integration pipeline',
    purpose:
      'The GitHub Actions pipeline: a lint gate, a sharded three-browser test matrix, separate accessibility and visual jobs, and a final job that merges every shard into one HTML report. It runs on pushes, pull requests, a nightly schedule, and on demand with an environment and tag filter.',
    blocks: [
      {
        type: 'table',
        head: ['Job', 'Depends on', 'What it does'],
        rows: [
          [
            '`lint`',
            '—',
            '`npm run typecheck`, `lint`, `format:check`. Fails fast before any browser starts.',
          ],
          [
            '`test`',
            '`lint`',
            '3 browsers x 3 shards = 9 parallel jobs, each uploading a blob report.',
          ],
          [
            '`accessibility`',
            '`lint`',
            'Runs the `accessibility` project and uploads the axe reports.',
          ],
          [
            '`visual`',
            '`lint`',
            'Runs the `visual` project on a fixed runner image so baselines stay valid.',
          ],
          [
            '`report`',
            'all of the above',
            '`playwright merge-reports` turns the blob shards into one browsable HTML report.',
          ],
        ],
      },
    ],
    changeWhen: [
      'You add a browser project or want a different shard count.',
      'A new secret or repository variable is needed.',
      'You want a different trigger — for example running only `@smoke` on pull requests and everything nightly.',
      'Artifact retention needs to change.',
    ],
    changeHow: [
      {
        text: 'To change sharding, edit the matrix and the `--shard` argument together. They must agree or tests will be silently skipped.',
        code: `strategy:
  matrix:
    project: [chromium, firefox, webkit]
    shard: [1, 2, 3, 4]
# ...
run: npx playwright test --project=\${{ matrix.project }} --shard=\${{ matrix.shard }}/4`,
      },
      {
        text: 'To run a reduced suite on pull requests and the full suite nightly, branch on the event name.',
        code: `run: npx playwright test --project=\${{ matrix.project }} \${{ github.event_name == 'pull_request' && '--grep @smoke' || '' }}`,
      },
      {
        text: 'To add a credential, define it in the repository settings and pass it through `env:` on the step. Never inline a secret value.',
        code: `env:
  PARTNER_API_KEY: \${{ secrets.PARTNER_API_KEY }}`,
      },
    ],
    why: 'Sharding is what keeps wall-clock time flat as the suite grows; blob reports plus a merge step are what make a sharded run still readable as one report. Splitting a11y and visual into their own jobs keeps their very different failure modes out of the functional matrix.',
    gotchas: [
      'Visual baselines are rendered by a specific OS and browser build. Changing `runs-on` will invalidate every screenshot.',
      'The browser cache key is derived from `package-lock.json`; bumping Playwright automatically busts it.',
    ],
    related: ['playwright.config.ts', 'package.json', 'Dockerfile'],
  },

  Dockerfile: {
    group: 'tooling',
    title: 'Container image',
    purpose:
      'Builds a test image from the official Playwright base image pinned to the same version as `@playwright/test`, with browsers, system libraries and fonts already present. Running here reproduces CI rendering exactly.',
    blocks: [
      {
        type: 'code',
        caption: 'Usage',
        text: `docker compose build
docker compose run --rm ui-tests --project=chromium --grep @smoke`,
      },
    ],
    changeWhen: [
      'You upgrade Playwright — the image tag must move with it.',
      'The suite needs an extra system package (a font, a PDF tool, a database client).',
    ],
    changeHow: [
      {
        text: 'Keep the image tag and the installed `@playwright/test` version identical. A mismatch produces confusing driver errors.',
        code: `FROM mcr.microsoft.com/playwright:v1.62.1-jammy`,
      },
      {
        text: 'Add system packages before `npm ci` so the dependency layer stays cached.',
        code: `RUN apt-get update && apt-get install -y --no-install-recommends fonts-noto-color-emoji && rm -rf /var/lib/apt/lists/*`,
      },
    ],
    why: 'Font and rendering differences between a developer laptop and CI are the classic cause of visual tests that pass locally and fail in the pipeline. The container removes that variable.',
    related: ['docker-compose.yml', '.github/workflows/playwright.yml'],
  },

  'docker-compose.yml': {
    group: 'tooling',
    title: 'Container run configuration',
    purpose:
      'Wraps the image with the environment variables, volume mounts and shared-memory settings a browser needs. Reports, results and the tests folder are mounted so output and updated baselines land back on your machine.',
    changeWhen: [
      'A new environment variable must reach the container, or you need another directory mounted.',
    ],
    changeHow: [
      {
        text: 'Pass variables through with a default so the file works even when your shell has nothing set.',
        code: `environment:
  FEATURE_FLAGS: \${FEATURE_FLAGS:-}`,
      },
    ],
    why: 'Chromium crashes on Docker’s default 64 MB of shared memory; `shm_size: 2gb` and `ipc: host` are the fix, and they belong with the run configuration rather than in every engineer’s notes.',
    related: ['Dockerfile'],
  },

  Makefile: {
    group: 'tooling',
    title: 'Task shortcuts',
    purpose:
      'A discoverable front door for the npm scripts. `make help` prints every target with its description, which is faster to scan than `package.json`.',
    changeWhen: [
      'You add an npm script that people will run often, or a multi-step workflow worth naming.',
    ],
    changeHow: [
      {
        text: 'Add the target with a `##` comment — `make help` builds itself from those comments — and add the name to `.PHONY`.',
        code: `smoke-staging: ## Run smoke tests against staging
	TEST_ENV=staging npm run test:smoke`,
      },
    ],
    why: 'Newcomers look for a Makefile. Giving them one that self-documents shortens the path from clone to first test run.',
    gotchas: [
      'Make requires real tab characters for recipe indentation; spaces produce a confusing syntax error.',
    ],
    related: ['package.json'],
  },

  '.vscode/settings.json': {
    group: 'tooling',
    title: 'Editor settings',
    purpose:
      'Format on save with Prettier, ESLint auto-fix on save, the workspace TypeScript version, non-relative import suggestions (so the aliases are offered), Playwright browser reuse, and noise folders hidden from search.',
    changeWhen: [
      'A setting helps everyone on the team. Personal preferences belong in your user settings, not here.',
    ],
    changeHow: [
      {
        text: 'Add the key. Keep the list short — a bloated workspace settings file quietly overrides personal setups.',
      },
    ],
    why: 'Shared editor behaviour means the code you commit is already formatted and linted, so the pre-commit hook rarely has to intervene.',
    related: ['.vscode/extensions.json'],
  },

  '.vscode/extensions.json': {
    group: 'tooling',
    title: 'Recommended extensions',
    purpose:
      'Prompts new contributors to install the Playwright test runner, ESLint, Prettier and EditorConfig extensions.',
    changeWhen: ['A tool becomes part of the standard workflow.'],
    changeHow: [{ text: 'Add its marketplace identifier to `recommendations`.' }],
    why: 'The Playwright extension provides in-editor run, debug and trace viewing; without it, newcomers fall back to raw CLI and miss the best debugging tools available.',
    related: ['.vscode/settings.json'],
  },

  'scripts/docs/extract-api.mjs': {
    group: 'docs-tooling',
    title: 'API extractor',
    purpose:
      'Walks the repository and parses every TypeScript file with the TypeScript compiler API, recording exported classes, functions, interfaces, types, constants and re-exports along with their JSDoc summaries and public member signatures. The result is written to `docs/generated/api.json`.',
    blocks: [
      {
        type: 'code',
        caption: 'Run it',
        text: `npm run docs:api   # writes docs/generated/api.json`,
      },
    ],
    changeWhen: [
      'You want an additional detail in the reference (decorators, parameter docs, private members).',
      'A new file type should be inventoried.',
    ],
    changeHow: [
      {
        text: 'Extend `memberSignature` or the statement loop in the extractor. Everything it records automatically appears in the generated pages — no page template needs editing.',
      },
    ],
    why: 'Hand-written API lists rot within one sprint. Reading the AST means the reference is always the code that actually shipped, and a forgotten method cannot silently go undocumented.',
    related: ['scripts/docs/build-docs.mjs'],
  },

  'scripts/docs/highlight.mjs': {
    group: 'docs-tooling',
    title: 'Syntax highlighter',
    purpose:
      'Colours every code snippet at build time. It detects the language of a snippet (TypeScript, shell, YAML, JSON, env file or Dockerfile), tokenises it with a single-pass lexer, and emits `<span class="tok-*">` markup that the stylesheets theme.',
    blocks: [
      {
        type: 'note',
        text: 'Highlighting happens during the build, not in the browser. A runtime library could not colour the PDF at all, and would add a CDN dependency to pages that otherwise work offline.',
      },
      {
        type: 'code',
        caption: 'Token classes emitted',
        text: `tok-c  comment      tok-f  function
tok-k  keyword      tok-t  type
tok-s  string       tok-p  property
tok-n  number       tok-o  operator
tok-r  regex        tok-v  variable
tok-a  flag`,
      },
    ],
    changeWhen: [
      'A snippet is highlighted as the wrong language.',
      'You add snippets in a language the lexer does not know.',
      'A keyword or token type is coloured incorrectly.',
    ],
    changeHow: [
      {
        text: 'Language detection lives in `detectLanguage`. The subtle case it guards is that a TypeScript object property (`maxUploadMb: raw.MAX_UPLOAD_MB,`) looks exactly like a YAML key — the `LOOKS_LIKE_CODE` pattern is what separates them.',
        code: `const LOOKS_LIKE_CODE =
  /=>|\\b(?:const|let|var|function|await|async|import|export|class|interface|extends|return|new|this)\\b|[;,]\\s*$/m;`,
      },
      {
        text: 'To add a language, write a lexer built from one master pattern with named groups and register it in the `LEXERS` map. A single pass is what prevents the double-escaping bugs that come from highlighting already-escaped HTML.',
        code: `const LEXERS = {
  ts: highlightTs,
  json: highlightJson,
  sql: highlightSql,   // new
};`,
      },
      {
        text: 'To force a language for one snippet, set `lang` on the content block instead of adjusting detection for everyone.',
        code: `{ type: 'code', lang: 'shell', caption: 'Run it', text: 'npm run docs' }`,
      },
      {
        text: 'Colours are not defined here. Add or change them in the `--sx-*` custom properties in `scripts/docs/docs.css` (site and print) and `scripts/docs/artifact.css` (hosted manual).',
      },
    ],
    why: 'Emitting classes rather than inline colours is what lets one highlighter serve three outputs with three different palettes — warm on the site, ink-safe in the PDF, cool in the hosted manual — and lets the hosted page recolour itself when the reader switches theme.',
    gotchas: [
      'The lexer escapes HTML as it goes; never pass it text that is already escaped, or entities will be double-encoded.',
      'Template literals are highlighted recursively so `${...}` interpolations read as code rather than as string content.',
    ],
    related: ['scripts/docs/render.mjs', 'scripts/docs/docs.css', 'scripts/docs/artifact.css'],
  },

  'scripts/docs/render.mjs': {
    group: 'docs-tooling',
    title: 'Shared HTML renderer',
    purpose:
      'Turns the structured content blocks (paragraphs, lists, tables, code, callouts, step lists, trees) and the extracted API data into HTML. Shared by the multi-page site, the print sheet and the published artifact so all three cannot disagree.',
    changeWhen: ['You need a new block type — a diagram, a definition list, a tabbed example.'],
    changeHow: [
      {
        text: 'Add a case to `renderBlock` and a matching style rule in the stylesheet inside `build-docs.mjs`.',
        code: `case 'diagram':
  return \`<figure class="diagram">\${block.svg}<figcaption>\${inline(block.caption)}</figcaption></figure>\`;`,
      },
    ],
    why: 'One renderer means adding a block type improves every output format at once.',
    related: ['scripts/docs/build-docs.mjs'],
  },

  'scripts/docs/build-docs.mjs': {
    group: 'docs-tooling',
    title: 'Site builder',
    purpose:
      'Merges the authored content modules with `docs/generated/api.json` and writes the HTML documentation site into `docs/site/`, including the single-page `print.html` used to produce the PDF and `artifact.html` used for the hosted version. It fails the build if any file in the repository has no documentation entry.',
    blocks: [
      {
        type: 'code',
        caption: 'Run it',
        text: `npm run docs:html    # site only
npm run docs         # extract + site + PDF`,
      },
      {
        type: 'note',
        text: 'The completeness check is the point: adding a source file without documenting it breaks `npm run docs`, so the documentation cannot silently fall behind the framework.',
      },
    ],
    changeWhen: [
      'You add a documentation page, reorder navigation, or change the visual design of the site.',
    ],
    changeHow: [
      {
        text: 'Add the page to the `PAGES` array with its id, title and content, and it appears in the navigation of every page automatically.',
      },
      {
        text: 'To document a new source file, add an entry keyed by its repository-relative path to the matching module in `scripts/docs/content/`.',
      },
    ],
    why: 'Generating the site from data rather than hand-maintaining HTML is what makes it feasible to keep 100+ file descriptions accurate over time.',
    related: ['scripts/docs/content/', 'scripts/docs/build-pdf.mjs'],
  },

  'scripts/docs/build-pdf.mjs': {
    group: 'docs-tooling',
    title: 'PDF builder',
    purpose:
      'Opens `docs/site/print.html` in the Chromium that ships with Playwright and prints it to `docs/playwright-ui-framework-documentation.pdf` with A4 pages, margins, and a header and footer carrying the document title and page numbers.',
    blocks: [{ type: 'code', caption: 'Run it', text: `npm run docs:pdf` }],
    changeWhen: ['You want different paper size, margins, or header and footer content.'],
    changeHow: [
      {
        text: 'Adjust the options passed to `page.pdf()`. The header and footer are HTML fragments with Chromium’s special classes for page numbers.',
        code: `await page.pdf({
  path: outputPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
  footerTemplate: '<div style="font-size:8px"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});`,
      },
    ],
    why: 'The framework already depends on Playwright, so generating the PDF with it adds no new tooling and guarantees the PDF matches the HTML exactly.',
    related: ['scripts/docs/build-docs.mjs'],
  },

  'scripts/docs/docs.css': {
    group: 'docs-tooling',
    title: 'Documentation stylesheet',
    purpose:
      'The single stylesheet for all three outputs: the screen layout (sidebar, tables, callouts, API blocks), the light and dark palettes, and the print sheet including the PDF cover page and page-break rules.',
    changeWhen: [
      'You change the visual design, add a block type that needs styling, or adjust the PDF page setup.',
    ],
    changeHow: [
      {
        text: 'Screen colours live in the `:root` custom properties and their dark-scheme overrides. Print rules live in the `body.print` and `@media print` sections at the bottom.',
        code: `body.print .file { page-break-inside: avoid; break-inside: avoid; }`,
      },
    ],
    why: 'One stylesheet for screen and print means a design change updates the site and the PDF together, rather than leaving the PDF looking a version behind.',
    related: ['scripts/docs/build-docs.mjs', 'scripts/docs/build-pdf.mjs'],
  },

  'scripts/docs/artifact.css': {
    group: 'docs-tooling',
    title: 'Hosted manual stylesheet',
    purpose:
      'The stylesheet for the hosted single-page manual, which has its own visual identity: IBM Plex Sans and Mono with Archivo for display, a cool slate ground and one ultramarine signal colour, plus full light, dark and system theme handling.',
    changeWhen: ['You restyle the hosted manual, or add a block type that needs styling there.'],
    changeHow: [
      {
        text: "Colours are defined as tokens in three places that must stay in step: the bare `:root` (light), the `prefers-color-scheme: dark` block guarded with `:root:not([data-theme='light'])`, and `:root[data-theme='dark']` for the explicit toggle. Style through the tokens, never with a literal inside a theme block.",
      },
    ],
    why: 'The hosted manual is read on someone else’s screen in their theme, so every colour has to resolve in all three theme states — a colour defined only inside a dark-mode block renders one theme’s text on the other theme’s background.',
    related: ['scripts/docs/build-docs.mjs', 'scripts/docs/docs.css'],
  },

  'docs/README.md': {
    group: 'docs-tooling',
    title: 'Documentation directory guide',
    purpose:
      'Explains what each documentation output is, how to regenerate them, and how to add an entry for a new file. The first thing to read when the docs build fails.',
    changeWhen: ['You add a documentation output or change the generation commands.'],
    changeHow: [
      {
        text: 'Update the table and the commands; keep it consistent with the scripts in `package.json`.',
      },
    ],
    why: 'The build failing on an undocumented file is only a helpful signal if the fix is written down next to it.',
    related: ['scripts/docs/build-docs.mjs', 'scripts/docs/content/'],
  },

  'scripts/docs/content/': {
    group: 'docs-tooling',
    title: 'Authored documentation content',
    purpose:
      'The prose source of this documentation, split into modules by area: `guides.mjs` for the long-form pages, and `files.*.mjs` for the per-file reference. Each file entry carries a purpose, when to change it, how to change it, why the change belongs there, gotchas and related files.',
    blocks: [
      {
        type: 'code',
        caption: 'The shape of a file entry',
        text: `'src/components/form/button.ts': {
  group: 'components-form',
  purpose: 'What the file is for.',
  changeWhen: ['Situations that require editing it'],
  changeHow: [{ text: 'Step', code: 'snippet' }],
  why: 'Why this is the right place for that change.',
  gotchas: ['Traps'],
  related: ['other/file.ts'],
}`,
      },
    ],
    changeWhen: ['Any time you add, remove or meaningfully change a file in the repository.'],
    changeHow: [
      {
        text: 'Add or edit the entry keyed by the repository-relative path, then run `npm run docs`. The build fails if a file has no entry, which is your reminder.',
      },
    ],
    why: 'Keeping prose beside a generated API surface gives the best of both: intent and rationale are written by a human, while signatures and members are always read from the code.',
    related: ['scripts/docs/build-docs.mjs'],
  },
};
