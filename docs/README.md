# Documentation

| Path                                        | What it is                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `site/index.html`                           | The HTML documentation site — 15 pages with navigation, per-page contents and a filterable API index. |
| `site/print.html`                           | Every page in one scrollable document; the source the PDF is rendered from.                           |
| `site/artifact.html`                        | The hosted single-page manual (section switching, cross-document search, light and dark themes).      |
| `playwright-ui-framework-documentation.pdf` | The printable manual, rendered from `site/print.html` by Playwright's Chromium.                       |
| `generated/api.json`                        | The API surface extracted from source by the TypeScript compiler API.                                 |
| `ARCHITECTURE.md`, `COMPONENTS.md`          | Short markdown summaries for reading on GitHub.                                                       |

## Regenerating

```bash
npm run docs        # extract API + build the site + render the PDF
npm run docs:api    # refresh generated/api.json only
npm run docs:html   # rebuild site/ only
npm run docs:pdf    # re-render the PDF only
```

## Adding documentation for a new file

The build fails when a repository file has no entry, which is what keeps this
documentation honest. Add the entry keyed by the file's repository-relative path to the
matching module in `scripts/docs/content/`:

```js
'src/components/data/timeline.ts': {
  group: 'components-data',
  purpose: 'What the file is for.',
  changeWhen: ['Situations that require editing it'],
  changeHow: [{ text: 'Step', code: 'snippet' }],
  why: 'Why this is the right place for that change.',
  gotchas: ['Traps'],
  related: ['src/components/data/table.ts'],
}
```

Purpose, guidance and rationale are written by hand; class members, signatures and JSDoc
summaries are read from the source, so the API half can never drift.
