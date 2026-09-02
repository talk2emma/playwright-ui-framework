/** Documentation for data, navigation, feedback, media and advanced components. */
export default {
  'src/components/data/table.ts': {
    group: 'components-data',
    title: 'Table',
    purpose:
      'HTML tables, with everything addressable by column **name** rather than index: reading all rows as objects, single cells, whole columns, finding rows by criteria, clicking a control inside a matching row, sorting, verifying sort order, and row selection.',
    blocks: [
      {
        type: 'code',
        caption: 'Name-based addressing is the point',
        text: `expect(await results.getAllRows()).toEqual([{ Name: 'Ada', Amount: '10' }]);
expect(await results.getColumnValues('Amount')).toBeSorted('asc');
await results.clickRowAction({ Name: 'Ada' }, 'button[aria-label="Edit"]');`,
      },
    ],
    changeWhen: [
      'Your table markup is not `thead`/`tbody`/`th`/`td`.',
      'Sorting is signalled by something other than `aria-sort` or an asc/desc class.',
      'You need a new table-wide operation (export, column totals, multi-column sort).',
    ],
    changeHow: [
      {
        text: 'Point the component at your markup with the options.',
        code: `ui.table('#report', {
  headerSelector: '.thead',
  rowSelector: '.trow',
  cellSelector: '.tcell',
  headerCellSelector: '.thcell',
});`,
      },
      {
        text: 'Add table-wide behaviour as a method here so every table gets it, and use `getColumnIndex()` so it keeps working when columns move.',
        code: `async getColumnTotal(columnName: string): Promise<number> {
  const values = await this.getColumnValues(columnName);
  return values.reduce((sum, value) => sum + extractNumber(value), 0);
}`,
      },
    ],
    why: 'Index-based table tests break the moment a column is inserted — the most common cause of large-scale suite breakage. Resolving the index from the header text once, at call time, removes that entire failure mode.',
    gotchas: [
      '`getColumnIndex()` throws with the list of available headers, which is usually enough to diagnose the failure without opening the trace.',
    ],
    related: ['src/components/data/data-grid.ts', 'src/fixtures/custom-matchers.ts'],
  },

  'src/components/data/data-grid.ts': {
    group: 'components-data',
    title: 'DataGrid',
    purpose:
      'Extends `Table` for enterprise grids — AG Grid, MUI DataGrid, Kendo, PrimeNG — which differ in three ways that matter: rows are `role="row"` divs, data loads asynchronously, and only the visible window exists in the DOM. Adds waiting for data, scrolling to a row, reading all rows through virtualisation, column filtering, resizing, reordering, row expansion and inline cell editing.',
    changeWhen: [
      'You adopt a different grid library, or need a grid feature not yet covered (grouping, pinned columns, aggregation rows).',
    ],
    changeHow: [
      {
        text: 'Most libraries need only selector configuration.',
        code: `ui.dataGrid('.ag-root-wrapper', {
  rowSelector: '.ag-row',
  cellSelector: '.ag-cell',
  headerCellSelector: '.ag-header-cell',
  virtualScrollContainerSelector: '.ag-body-viewport',
  loadingSelector: '.ag-overlay-loading-center',
});`,
      },
      {
        text: 'Add new grid features as methods here, bounded by a maximum scroll count so a missing row fails with a clear message instead of hanging.',
      },
    ],
    why: '"Not in the DOM" does not mean "not in the data" for a virtualised grid. Scrolling until the row renders is the only correct way to assert on it, and doing that once here keeps the complexity out of tests.',
    gotchas: [
      '`getAllRowsVirtualized()` deduplicates by row content; genuinely identical rows collapse into one.',
    ],
    related: ['src/components/data/table.ts'],
  },

  'src/components/data/list.ts': {
    group: 'components-data',
    title: 'ListView',
    purpose:
      'Ordered and unordered lists, `role="list"` and card collections: reading items, clicking by text or index, membership checks, index lookup and order verification.',
    changeWhen: ['Your list items are not `li` or `[role="listitem"]`.'],
    changeHow: [
      {
        text: 'Pass `itemSelector`.',
        code: `ui.list('[data-testid="results"]', { itemSelector: '.result-card' });`,
      },
    ],
    why: 'Order assertions belong on the list, because "is it sorted" is a property of the collection rather than of any one test.',
    related: ['src/components/data/card.ts'],
  },

  'src/components/data/tree.ts': {
    group: 'components-data',
    title: 'TreeView',
    purpose:
      'Tree views and file explorers: expanding and collapsing, walking a path of ancestors to a leaf, selection state, nesting level from `aria-level`, listing visible nodes and children.',
    changeWhen: [
      'Your tree nodes are not `[role="treeitem"]`, or expansion state is signalled only by a class.',
    ],
    changeHow: [
      {
        text: 'Pass `nodeSelector`, `labelSelector` and `toggleSelector`; `expandPath()` then works unchanged.',
        code: `await tree.expandPath(['src', 'components', 'form', 'button.ts']);`,
      },
    ],
    why: 'Expanding ancestors in order is the only reliable way to reach a leaf in a lazily rendered tree, and it is worth writing once.',
    related: [],
  },

  'src/components/data/pagination.ts': {
    group: 'components-data',
    title: 'Pagination',
    purpose:
      'Page controls: next, previous, first, last, a specific page, current page, total pages (from info text or the highest page link), page size, enabled state of the arrows, and `forEachPage()` for walking the whole set.',
    changeWhen: ['Your pagination markup or info text differs from the defaults.'],
    changeHow: [
      {
        text: 'Configure the selectors, then use `forEachPage` to run an assertion across every page.',
        code: `await pagination.forEachPage(async (page) => {
  expect(await table.rowCount()).toBeLessThanOrEqual(25);
});`,
      },
    ],
    why: 'Deriving total pages from the info text first, then from the page links, means the component works whether or not the application renders a summary.',
    related: ['src/components/data/table.ts'],
  },

  'src/components/data/card.ts': {
    group: 'components-data',
    title: 'Card',
    purpose:
      'Cards and tiles — product cards, dashboard widgets, search results. A small composite of title, body, image, price and actions, with `withTitle()` to narrow a collection to one card.',
    changeWhen: ['Your card anatomy differs, or a card gains a new region worth asserting.'],
    changeHow: [
      {
        text: 'Pass the region selectors at construction, then address individual cards by title.',
        code: `const card = ui.card('.product-card').withTitle('Wireless Mouse');
await card.clickAction('Add to cart');`,
      },
    ],
    why: 'Selecting a card by its title rather than its index keeps tests readable and immune to sort-order changes.',
    related: ['src/components/data/list.ts'],
  },

  'src/components/navigation/link.ts': {
    group: 'components-navigation',
    title: 'Link',
    purpose:
      'Anchors, including the awkward parts: reading `href` and `target`, clicking and waiting for navigation, opening and returning a new tab, cheap reachability checking with a HEAD request, and internal-versus-external detection.',
    changeWhen: [
      'You need link-checking behaviour beyond a HEAD request, or your application intercepts anchor clicks.',
    ],
    changeHow: [
      {
        text: 'Use `clickAndGetNewTab()` for `target="_blank"` links; it returns the new page for assertions.',
        code: `const docs = await helpLink.clickAndGetNewTab();
await expect(docs).toHaveTitle(/documentation/i);`,
      },
    ],
    why: 'Capturing the new page at click time is the only reliable way to test a link that opens a tab; polling the context afterwards races the browser.',
    related: ['src/utils/browser.utils.ts'],
  },

  'src/components/navigation/tabs.ts': {
    group: 'components-navigation',
    title: 'Tabs',
    purpose:
      'Tab strips and their panels: selecting by name or index, reading the active tab and all tab names, disabled state, resolving the panel bound to a tab through `aria-controls`, and arrow-key navigation per the WAI-ARIA pattern.',
    changeWhen: [
      'Your tabs are not `[role="tab"]`, or panels are not linked with `aria-controls`.',
    ],
    changeHow: [
      {
        text: 'Pass `tabSelector` and `panelSelector`; assert against `activePanel` so the assertion follows the selection.',
        code: `await tabs.select('Billing');
await expect(tabs.activePanel).toContainText('Payment method');`,
      },
    ],
    why: 'Resolving the panel from `aria-controls` means the component follows the application’s own wiring instead of guessing which panel is visible.',
    related: ['src/components/navigation/accordion.ts'],
  },

  'src/components/navigation/accordion.ts': {
    group: 'components-navigation',
    title: 'Accordion',
    purpose:
      'Collapsible sections: expand, collapse, toggle, expansion state (via `aria-expanded`, the `open` attribute on `details`, or class names), section content, expand-all and collapse-all, and counting expanded sections to verify single-open behaviour.',
    changeWhen: ['Your accordion uses different header or panel markup.'],
    changeHow: [
      { text: 'Pass `headerSelector`, `panelSelector` and `itemSelector` at construction.' },
    ],
    why: 'Checking three different expansion signals in order is what makes one class work for `<details>`, ARIA accordions and CSS-class implementations.',
    related: ['src/components/navigation/tabs.ts'],
  },

  'src/components/navigation/menu.ts': {
    group: 'components-navigation',
    title: 'Menu',
    purpose:
      'Navigation menus, menubars and context menus, including nested submenus. `navigateTo(path)` walks a nested path with the gesture the menu expects (click or hover), and `openContextMenu(target)` right-clicks an element to open it.',
    changeWhen: ['Your menu opens on hover, or submenu markup differs.'],
    changeHow: [
      {
        text: "Set `openOn: 'hover'` and the submenu selector at construction.",
        code: `const nav = ui.menu('nav.main', { openOn: 'hover', submenuSelector: '.dropdown-panel' });
await nav.navigateTo(['Reports', 'Sales', 'By region']);`,
      },
    ],
    why: 'Encoding the open gesture as configuration keeps one class usable for both click-driven and hover-driven navigation.',
    related: [],
  },

  'src/components/navigation/breadcrumb.ts': {
    group: 'components-navigation',
    title: 'Breadcrumb',
    purpose:
      'Breadcrumb trails: reading the trail, the current page, navigating to an ancestor, going up a number of levels, and depth.',
    changeWhen: ['Your separator or item markup differs.'],
    changeHow: [
      { text: 'Pass `itemSelector` and `separator` so trail text is cleaned correctly.' },
    ],
    why: 'Stripping the separator from item text is what makes trail assertions readable rather than full of slashes and chevrons.',
    related: [],
  },

  'src/components/navigation/stepper.ts': {
    group: 'components-navigation',
    title: 'Stepper',
    purpose:
      'Multi-step wizards: next, back, finish, jumping to a step, current step number and name, all step names, completion and disabled state, and whether you are on the last step.',
    changeWhen: [
      'Your wizard buttons are labelled differently, or steps are marked complete by another class.',
    ],
    changeHow: [
      {
        text: 'Pass the button selectors at construction.',
        code: `ui.stepper('.wizard', {
  nextSelector: '[data-testid="continue"]',
  finishSelector: '[data-testid="place-order"]',
});`,
      },
    ],
    why: 'Keeping step navigation in the component lets a checkout test read as business steps rather than as button clicks.',
    related: [],
  },

  'src/components/feedback/modal.ts': {
    group: 'components-feedback',
    title: 'Modal',
    purpose:
      'Dialogs, drawers and confirmations: waiting for open and close, title and body text, confirm, cancel, close, Escape, overlay click, arbitrary buttons by name — plus the two things modals routinely get wrong, focus trapping and ARIA semantics.',
    blocks: [
      {
        type: 'code',
        caption: 'Accessibility checks that belong on the component',
        text: `expect(await confirmDialog.hasCorrectAriaSemantics()).toBe(true);  // role + aria-modal
expect(await confirmDialog.isFocusTrapped()).toBe(true);`,
      },
    ],
    changeWhen: [
      'Your dialog markup or button labels differ, or your design system needs a different close gesture.',
    ],
    changeHow: [
      {
        text: 'Pass the selectors at construction; use `clickButton(name)` for buttons that are not confirm or cancel.',
      },
    ],
    why: 'Focus trapping and `aria-modal` are correctness properties of every dialog, so checking them belongs with the component rather than in a separate accessibility test.',
    related: ['src/utils/a11y.utils.ts'],
  },

  'src/components/feedback/alert.ts': {
    group: 'components-feedback',
    title: 'Alert',
    purpose:
      'Toasts, snackbars and inline alerts. `waitForMessage()` races the auto-dismiss timer instead of assuming the toast is still on screen; severity is classified from role and class names; dismissal, bulk dismissal, auto-dismiss verification and screen-reader announcement checks are included.',
    changeWhen: ['Your toast markup or severity classes differ, or a new severity appears.'],
    changeHow: [
      {
        text: 'Extend the severity patterns in `getSeverity()`, or pass a message selector when the text sits in a child element.',
        code: `ui.alert('.Toastify__toast', { messageSelector: '.Toastify__toast-body' });`,
      },
    ],
    why: 'Transient toasts are a classic flaky assertion: the test reads the element after it has gone. Capturing the text during the visibility window removes the race entirely.',
    gotchas: [
      'If a toast is genuinely gone before the assertion, slow the application rather than the test — or assert on the resulting state instead.',
    ],
    related: ['src/components/feedback/tooltip.ts'],
  },

  'src/components/feedback/tooltip.ts': {
    group: 'components-feedback',
    title: 'Tooltip',
    purpose:
      'Tooltips and popovers. The component wraps the **trigger**; the bubble is found separately because it is nearly always portalled. Supports hover, click and focus triggers, reading text, native `title` attributes, computed placement, and whether trigger and bubble are linked by `aria-describedby`.',
    changeWhen: ['Your tooltip is triggered differently or rendered in a specific container.'],
    changeHow: [
      {
        text: 'Pass `trigger` and `tooltipSelector` at construction.',
        code: `ui.tooltip('#help-icon', { trigger: 'click', tooltipSelector: '.popover-body' });`,
      },
    ],
    why: 'Native `title` tooltips never appear in the DOM, so the component reads the attribute directly — otherwise those tests would be impossible to write.',
    related: [],
  },

  'src/components/feedback/progress.ts': {
    group: 'components-feedback',
    title: 'ProgressBar and Loader',
    purpose:
      'Two related components in one file. `ProgressBar` reads value, maximum, percentage and indeterminate state, and can wait for completion or a threshold. `Loader` models a spinner or skeleton — an element whose whole job is to disappear — with `waitForFinish()` and `around(action)`.',
    blocks: [
      {
        type: 'code',
        caption: 'Wrapping an action in its spinner',
        text: `await loader.around(() => saveButton.click());   // click, then wait for the spinner to clear`,
      },
    ],
    changeWhen: [
      'Your progress indicator does not expose `aria-valuenow`, or a new loading pattern appears.',
    ],
    changeHow: [
      {
        text: 'Add the reading logic to `getValue()`; keep `waitForComplete` expressed in terms of percentage so callers do not care about the source.',
      },
    ],
    why: 'A spinner that never appears is as common as one that never leaves; `waitForFinish` tolerates both by treating the appearance as optional and the disappearance as required.',
    related: ['src/components/form/button.ts'],
  },

  'src/components/media/image.ts': {
    group: 'components-media',
    title: 'Image',
    purpose:
      'Images, including the cases that matter: whether the bitmap actually decoded (`complete` plus non-zero `naturalWidth`, not merely "element visible"), intrinsic dimensions, broken detection, lazy-loading, `srcset` entries and accessible alt-text rules.',
    changeWhen: ['You need image-specific assertions such as aspect ratio or format checking.'],
    changeHow: [
      {
        text: 'Add the method here and express it in terms of `getNaturalSize()` so it works for any image.',
        code: `async getAspectRatio(): Promise<number> {
  const { width, height } = await this.getNaturalSize();
  return height === 0 ? 0 : width / height;
}`,
      },
    ],
    why: 'A broken image is still a visible element. Checking the decoded bitmap is the only assertion that catches a 404 asset.',
    related: [],
  },

  'src/components/media/media-player.ts': {
    group: 'components-media',
    title: 'MediaPlayer',
    purpose:
      'Video and audio driven through the media element’s own DOM API rather than custom player chrome, so the same component works for any skin: play, pause, seek, volume, mute, playback rate, readiness, playback progress, ended state, current source and text tracks.',
    changeWhen: [
      'You need to test the player’s visible controls rather than the media element itself.',
    ],
    changeHow: [
      {
        text: 'Use `Button` components for the chrome and this component for verification — click the custom play button, then assert `isPlaying()` here.',
      },
    ],
    why: 'Driving the element API is stable across player redesigns; asserting through it while clicking the real controls tests both layers honestly.',
    gotchas: [
      'Autoplay policies block programmatic `play()` with sound in some browsers; mute first when that applies.',
    ],
    related: [],
  },

  'src/components/media/canvas.ts': {
    group: 'components-media',
    title: 'Canvas',
    purpose:
      'Canvas elements — signature pads, drawing tools, charts and games. Since canvas has no DOM to query, everything is coordinate- or pixel-based: drawing strokes, clicking and hovering at points, reading a pixel colour, checking whether the canvas is blank, exporting a data URL and reading dimensions.',
    changeWhen: ['You need a new gesture (pinch, multi-touch) or a different verification method.'],
    changeHow: [
      {
        text: 'Compose new gestures from mouse moves relative to the canvas origin, as `draw()` does.',
        code: `await signature.scribble();
expect(await signature.isBlank()).toBe(false);`,
      },
    ],
    why: 'Pixel and blank checks are the only assertions available for canvas content, so providing them here prevents every test from re-implementing `getImageData` logic.',
    gotchas: ['`getPixelColor` and `isBlank` require a same-origin, non-tainted canvas.'],
    related: ['src/utils/visual.utils.ts'],
  },

  'src/components/media/frame.ts': {
    group: 'components-media',
    title: 'Frame',
    purpose:
      'An iframe wrapper. Frames are not components — they are **scopes**. This class hands you a `FrameLocator` that any other component can be built against, so cross-frame testing needs no special-case code anywhere else. Also exposes the iframe element itself, load waiting, nesting, the frame URL and a static listing of all frames.',
    blocks: [
      {
        type: 'code',
        caption: 'Any component, inside a frame',
        text: `const payment = new Frame(page, '#payment-iframe');
await payment.waitForLoaded();

const card = new TextInput(payment.locator, '#card-number');
const pay  = new Button(payment.locator, '#submit');
// or: const inFrame = ui(payment.locator);`,
      },
    ],
    changeWhen: ['You need nested frame handling or frame-specific diagnostics.'],
    changeHow: [
      {
        text: 'Use `child()` for nested frames; use the static `Frame.listFrames(page)` when the selector is unknown.',
      },
    ],
    why: 'Treating a frame as a scope rather than a component is what keeps iframe support from leaking into all 37 component classes.',
    gotchas: [
      'Cross-origin frames cannot be inspected from the parent document, so `waitForLoaded()` degrades gracefully instead of failing.',
    ],
    related: ['src/core/locator.factory.ts'],
  },

  'src/components/media/carousel.ts': {
    group: 'components-media',
    title: 'Carousel',
    purpose:
      'Image and content carousels: next, previous, going to a slide by indicator or by stepping, current slide index and text, slide count, verifying autoplay advances, and swiping for the mobile path.',
    changeWhen: ['Your carousel markup or active-slide signal differs.'],
    changeHow: [
      {
        text: 'Pass `slideSelector`, `indicatorSelector` and `activeSlidePattern` at construction.',
      },
    ],
    why: 'Autoplay is a behaviour worth asserting and easy to get wrong; `waitForAutoAdvance()` gives it a bounded, explicit check.',
    related: [],
  },

  'src/components/advanced/drag-drop.ts': {
    group: 'components-advanced',
    title: 'Draggable and DropZone',
    purpose:
      'Drag and drop with three strategies deliberately, because no single approach works across every library: Playwright’s built-in `dragTo` for standard HTML5 drag, `dragManually()` with explicit mouse steps for react-dnd, dnd-kit and Sortable, and `dragWithDataTransfer()` dispatching synthetic events for custom handlers. Also `dragBy()` for reordering and `dragWithKeyboard()` for the accessible path. `DropZone` covers the target: active state, dropped items and membership.',
    blocks: [
      {
        type: 'code',
        caption: 'Escalation order when a drag does not work',
        text: `await item.dragTo(zone);                                  // 1. built-in
await item.dragManually(zone, { steps: 25, holdMs: 150 }); // 2. explicit mouse
await item.dragWithDataTransfer(zone);                     // 3. synthetic events`,
      },
    ],
    changeWhen: [
      'A library needs a different gesture — a longer hold, more intermediate moves, a specific drop position.',
    ],
    changeHow: [
      {
        text: 'Tune `dragManually` options first; add a new strategy method only if a library genuinely needs one.',
      },
    ],
    why: 'Discovering mid-sprint that your DnD library ignores synthetic events is expensive. Shipping all three strategies turns that discovery into a one-line change.',
    gotchas: [
      '`dragManually` deliberately makes a small initial move — that is how most libraries detect that a drag has started.',
    ],
    related: ['src/components/form/file-upload.ts'],
  },

  'src/components/advanced/shadow-dom.ts': {
    group: 'components-advanced',
    title: 'ShadowHost',
    purpose:
      'Web components with a shadow root. Playwright pierces **open** shadow roots automatically, so plain locators usually work; this class exists for the parts that do not — closed roots, slotted content, and inspecting the boundary itself. Also a static helper that lists every custom element on the page.',
    changeWhen: ['You meet a closed shadow root, or need to assert on slotted light-DOM content.'],
    changeHow: [
      {
        text: 'Use `inShadow()` for ordinary cases and the evaluate-based helpers when the locator engine cannot reach inside.',
        code: `const picker = ui.shadowHost('my-date-picker');
expect(await picker.getShadowMode()).toBe('open');
await picker.clickInShadow('.today');`,
      },
    ],
    why: 'Most shadow-DOM advice on the internet is obsolete because Playwright handles the common case; documenting that here stops teams writing unnecessary workarounds.',
    related: ['src/core/locator.factory.ts'],
  },

  'src/components/advanced/rich-text-editor.ts': {
    group: 'components-advanced',
    title: 'RichTextEditor',
    purpose:
      'WYSIWYG editors — Quill, TinyMCE, CKEditor, ProseMirror, Slate. Typing, replacing content, reading text **and** generated HTML, selecting a substring through the Range API, toolbar actions, keyboard formatting shortcuts, formatting assertions, word count and empty checks. Editors rendered inside an iframe are supported through the `iframeSelector` option.',
    changeWhen: ['You switch editors, or need a formatting operation not covered.'],
    changeHow: [
      {
        text: 'Configure the editable body, toolbar and iframe at construction.',
        code: `ui.richText('.tox-tinymce', {
  iframeSelector: 'iframe.tox-edit-area__iframe',
  editableSelector: 'body#tinymce',
  toolbarSelector: '.tox-toolbar__primary',
});`,
      },
    ],
    why: 'Asserting on rendered HTML rather than plain text is what makes these tests meaningful — plain text hides every formatting bug the editor could have.',
    related: ['src/components/media/frame.ts'],
  },

  'src/components/advanced/infinite-scroll.ts': {
    group: 'components-advanced',
    title: 'InfiniteScroll',
    purpose:
      'Infinite-scroll and lazy-loaded lists. The hard part is knowing when loading has stopped, so this waits for the item count to stabilise rather than trusting a spinner that may never render. Supports loading one more page, loading everything up to a cap, scrolling until a specific item appears, and end-of-list detection.',
    changeWhen: [
      'Your feed scrolls the window rather than a container, or uses a different end marker.',
    ],
    changeHow: [
      {
        text: 'Set `scrollWindow: true` and the marker selectors at construction; always keep a scroll cap.',
        code: `const feed = ui.infiniteScroll('#feed', { scrollWindow: true, endMarkerSelector: '.no-more-posts' });
const total = await feed.loadAll(30);`,
      },
    ],
    why: 'The scroll cap is a safety net: an unbounded feed would otherwise scroll forever and fail as a timeout with no useful message.',
    related: ['src/components/data/data-grid.ts'],
  },

  'src/components/advanced/chart.ts': {
    group: 'components-advanced',
    title: 'Chart',
    purpose:
      'SVG charts from D3, Highcharts, Chart.js in SVG mode or Recharts. Charts have no text to assert on, so the useful checks are the number of marks, the legend, axis labels, tooltips revealed on hover, series toggling, values in data attributes, bar heights as a proxy for relative values, and the accessible description.',
    changeWhen: [
      'You use a canvas-based charting library, or need to assert on a different visual property.',
    ],
    changeHow: [
      {
        text: 'For SVG charts, configure the selectors. For canvas-based charts, use the `Canvas` component plus a visual baseline instead.',
        code: `ui.chart('.highcharts-container', {
  dataPointSelector: '.highcharts-point',
  legendSelector: '.highcharts-legend',
  tooltipSelector: '.highcharts-tooltip',
});`,
      },
    ],
    why: 'Hovering a mark and reading its tooltip is usually the only way to verify a data value, because the rendered chart itself carries no accessible text.',
    related: ['src/components/media/canvas.ts', 'src/utils/visual.utils.ts'],
  },
};
