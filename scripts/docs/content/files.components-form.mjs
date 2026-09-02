/** Documentation for form-control components and the component factory. */
export default {
  'src/components/index.ts': {
    group: 'components-core',
    title: 'Component barrel',
    purpose:
      "Re-exports every component class and its options type, plus the `ui` factory. This is the public surface of the component library: `import { Table, Modal, ui } from '@components/index'`.",
    changeWhen: ['You add a component, or rename an existing one.'],
    changeHow: [
      {
        text: 'Add the export beside its group, and add the matching factory method in `component.factory.ts` in the same commit.',
        code: `export { Timeline, type TimelineOptions } from './data/timeline';`,
      },
    ],
    why: 'A single import path keeps page objects tidy and lets the library be reorganised internally without touching consumers.',
    related: ['src/components/component.factory.ts'],
  },

  'src/components/component.factory.ts': {
    group: 'components-core',
    title: 'UI factory',
    purpose:
      'An ergonomic factory bound to a scope — a page, an iframe or a container locator. Page objects call `ui(page).table(...)` instead of constructors, and `within()` re-scopes to a container so selectors stay short and strict-mode collisions are avoided.',
    blocks: [
      {
        type: 'code',
        caption: 'Scoping',
        text: `const factory = ui(page);                              // whole page
const dialog  = ui(page.locator('#confirm-dialog'));  // inside one container
const payment = ui(new Frame(page, '#pay').locator);  // inside an iframe

readonly submit = factory.button('[data-testid="submit"]', { name: 'Submit order' });`,
      },
    ],
    changeWhen: ['You add a component class and want it available through the factory.'],
    changeHow: [
      {
        text: 'Import the class, then add a method named after how a tester would say it. Keep the options type specific so editor autocomplete lists the component’s own selectors.',
        code: `timeline = (selector: SelectorLike, options?: TimelineOptions): Timeline =>
  new Timeline(this.scope, selector, options);`,
      },
    ],
    why: 'Constructors need a scope argument every time; the factory carries it. That is what makes container-scoped and frame-scoped components a one-line change rather than a refactor.',
    gotchas: [
      '`frame()` returns a `Frame`, which is a scope rather than a component — pass `frame.locator` to other factory calls.',
    ],
    related: ['src/components/index.ts', 'src/core/locator.factory.ts'],
  },

  'src/components/form/button.ts': {
    group: 'components-form',
    title: 'Button',
    purpose:
      'Any clickable control: a real `<button>`, an `<input type="submit">`, an anchor with `role="button"`, or a div a framework decided to treat as a button. Adds the click variants that matter in practice — clicking only once enabled, clicking and waiting for navigation, and clicking then waiting for the busy state to clear.',
    changeWhen: [
      'Your application signals loading differently from the defaults (`aria-busy`, `.spinner`, `.loading`).',
      'A new click-and-wait pattern recurs across tests.',
    ],
    changeHow: [
      {
        text: 'Pass your own busy selector at the call site when it is page-specific.',
        code: `await this.submitButton.clickAndWaitForCompletion('[data-testid="save-spinner"]');`,
      },
      {
        text: 'If the same selector is used everywhere, change the default in the method signature so no call site has to repeat it.',
      },
    ],
    why: 'Click-then-wait belongs on the button rather than in every test, because the waiting rule is a property of the control, not of the scenario.',
    related: ['src/components/feedback/progress.ts'],
  },

  'src/components/form/text-input.ts': {
    group: 'components-form',
    title: 'TextInput',
    purpose:
      'Single-line inputs of every flavour — text, email, password, number, tel, url, search — plus `contenteditable` fields. Handles the two ways of entering text (`fill` and key-by-key `pressSequentially`), clearing, pasting, and the whole validation surface: native constraint messages, `aria-invalid`, and error text resolved through `aria-describedby`.',
    blocks: [
      {
        type: 'code',
        caption: 'Typing modes matter',
        text: `await input.type('SAVE20');                              // fast fill
await input.type('4242 4242', { pressSequentially: true }); // masked / per-key validation
await input.typeAndSettle('lap');                          // types, then waits out the debounce`,
      },
    ],
    changeWhen: [
      'Your application renders validation errors somewhere `aria-describedby` does not reach.',
      'A field type needs special handling (a currency mask, a phone formatter).',
    ],
    changeHow: [
      {
        text: 'Extend `getErrorMessage()` to look in your application’s error container as a fallback, keeping the accessible lookup first.',
        code: `async getErrorMessage(): Promise<string> {
  const accessible = await super.getErrorMessage();
  if (accessible) return accessible;
  const sibling = this.locator.locator('xpath=following-sibling::*[contains(@class,"field-error")]');
  return (await sibling.count()) > 0 ? (await sibling.first().innerText()).trim() : '';
}`,
      },
      {
        text: 'For a specialised field, subclass rather than adding flags: `class CurrencyInput extends TextInput` keeps the general case simple.',
      },
    ],
    why: 'Reading validation state through ARIA first means the component tests the same signal a screen reader uses, so accessible markup and reliable tests reinforce each other.',
    gotchas: [
      '`fill()` replaces the value in one operation and does not fire per-character events; masked inputs need `pressSequentially: true`.',
    ],
    related: ['src/components/form/text-area.ts', 'src/fixtures/custom-matchers.ts'],
  },

  'src/components/form/text-area.ts': {
    group: 'components-form',
    title: 'TextArea',
    purpose:
      'Multi-line fields. Inherits all validation handling from `TextInput` and adds row count, character count and `typeLines()`, which enters multi-line content using either Enter or Shift+Enter for editors where Enter submits.',
    changeWhen: ['A character counter or auto-grow behaviour needs asserting.'],
    changeHow: [
      {
        text: 'Add the assertion here rather than in tests, so every textarea in the application is verified the same way.',
      },
    ],
    why: 'The difference between Enter and Shift+Enter is a property of the control; encoding it once avoids a class of confusing test failures in chat and comment fields.',
    related: ['src/components/form/text-input.ts'],
  },

  'src/components/form/checkbox.ts': {
    group: 'components-form',
    title: 'Checkbox',
    purpose:
      'Native checkboxes and ARIA checkboxes, including the tri-state `indeterminate` case used by "select all" controls. `check()` and `uncheck()` are idempotent and fall back to a click when Playwright’s strict checkable definition does not apply.',
    changeWhen: [
      'Your checkbox is a styled div that ignores clicks on the input itself, or the label carries the click target.',
    ],
    changeHow: [
      {
        text: 'Point the component at the element that actually receives the click, and let the component read state from the input.',
        code: `ui.checkbox('label[for="terms"]', { name: 'Accept terms' });`,
      },
    ],
    why: 'Reading state from the native property or `aria-checked` while clicking the visible control is what makes one class work for both native and design-system checkboxes.',
    related: ['src/components/form/toggle.ts', 'src/components/form/radio-group.ts'],
  },

  'src/components/form/radio-group.ts': {
    group: 'components-form',
    title: 'RadioGroup',
    purpose:
      'A set of mutually exclusive options addressed by value, label or index. The component wraps the container — a `role="radiogroup"`, a fieldset, or any wrapper — and discovers options beneath it.',
    changeWhen: ['Your radio options are not `input[type="radio"]` or `[role="radio"]`.'],
    changeHow: [
      {
        text: 'Pass `optionSelector` when constructing.',
        code: `ui.radioGroup('[data-testid="plan"]', { optionSelector: '.plan-card' });`,
      },
    ],
    why: 'Addressing options by label rather than index keeps tests readable and stable when the option order changes.',
    related: ['src/components/form/checkbox.ts'],
  },

  'src/components/form/select.ts': {
    group: 'components-form',
    title: 'Select (native)',
    purpose:
      'Native `<select>` elements. Selection by value, label or index; reading selected value and label; enumerating options with their disabled state; multiple-selection support.',
    changeWhen: ['Rarely. Native select behaviour is standardised.'],
    changeHow: [
      {
        text: 'If the control is not a real `<select>`, use `Dropdown` instead — the two are separate classes precisely because their mechanics differ.',
      },
    ],
    why: 'Native selects are driven by Playwright’s `selectOption`, which is faster and far more reliable than clicking a rendered list.',
    related: ['src/components/form/dropdown.ts'],
  },

  'src/components/form/dropdown.ts': {
    group: 'components-form',
    title: 'Dropdown (custom)',
    purpose:
      'Non-native dropdowns, comboboxes and listboxes from React-Select, MUI, Ant Design, Kendo and similar libraries. The component wraps the visible trigger; the panel is looked up on the page rather than under the trigger, because most libraries render it in a portal at body level.',
    blocks: [
      {
        type: 'code',
        caption: 'Adapting it to a library — configuration, not a new class',
        text: `ui.dropdown('#country', {
  panelSelector: '.MuiAutocomplete-popper',
  optionSelector: '.MuiAutocomplete-option',
  searchSelector: '#country',
  valueSelector: '.MuiAutocomplete-input',
});`,
      },
    ],
    changeWhen: [
      'You adopt a component library whose panel, option or search markup differs from the defaults.',
      'The dropdown needs a different open or close gesture.',
    ],
    changeHow: [
      { text: 'First try the options above — most libraries need nothing more.' },
      {
        text: 'If the interaction itself differs, subclass and override the specific method, keeping everything else inherited.',
        code: `class HoverDropdown extends Dropdown {
  override async open(): Promise<void> {
    await this.step('open on hover', async () => {
      await this.locator.hover();
      await this.panel.waitFor({ state: 'visible' });
    });
  }
}`,
      },
    ],
    why: 'Portalled panels are why a naive `trigger.locator(".option")` fails on most modern UI kits; looking the panel up on the page is the difference between a component that works with one library and one that works with all of them.',
    gotchas: [
      '`isOpen()` prefers `aria-expanded` and falls back to panel visibility, so accessible markup gives the most reliable behaviour.',
    ],
    related: ['src/components/form/multi-select.ts', 'src/components/form/autocomplete.ts'],
  },

  'src/components/form/multi-select.ts': {
    group: 'components-form',
    title: 'MultiSelect',
    purpose:
      'Extends `Dropdown` for controls that hold several values at once, usually rendered as removable chips. Adds selecting many, reading selected items, removing one, clearing all, and the Backspace gesture that removes the last chip.',
    changeWhen: [
      'Your chips, their remove buttons, or the clear-all control use different markup.',
    ],
    changeHow: [
      {
        text: 'Pass `chipSelector`, `chipRemoveSelector` or `clearAllSelector` when constructing.',
        code: `ui.multiSelect('#tags', { chipSelector: '.ant-select-selection-item', chipRemoveSelector: '.ant-select-selection-item-remove' });`,
      },
    ],
    why: 'Extending `Dropdown` rather than duplicating it means an improvement to panel handling benefits both classes.',
    related: ['src/components/form/dropdown.ts'],
  },

  'src/components/form/autocomplete.ts': {
    group: 'components-form',
    title: 'Autocomplete',
    purpose:
      'Typeahead fields that fetch suggestions asynchronously. It models the debounce and loading phases explicitly — type, wait out the debounce, wait for the loading indicator to clear, then wait for the list — which is what turns the flakiest widget in most suites into a reliable one.',
    changeWhen: [
      'Your debounce is longer than the default 500 ms.',
      'The suggestion list, loading indicator or empty state uses different markup.',
    ],
    changeHow: [
      {
        text: 'Configure the timings and selectors at construction.',
        code: `ui.autocomplete('#city', {
  debounceMs: 800,
  suggestionListSelector: '[data-testid="city-results"]',
  loadingSelector: '[data-testid="city-loading"]',
  noResultsSelector: '[data-testid="city-empty"]',
});`,
      },
      {
        text: 'For a deterministic test, stub the suggestions endpoint with the `network` fixture instead of increasing timeouts.',
        code: `await network.mock('**/api/cities*', { body: [{ id: 1, name: 'Lagos' }] });`,
      },
    ],
    why: 'Waiting on the widget’s own signals rather than a fixed sleep is what makes the test both fast and stable; stubbing the endpoint removes the remaining dependency on a third-party search service.',
    related: ['src/utils/network.utils.ts'],
  },

  'src/components/form/file-upload.ts': {
    group: 'components-form',
    title: 'FileUpload',
    purpose:
      'Uploads in all three flavours: a plain `<input type="file">`, a hidden input behind a styled button (via the file chooser event), and a drag-and-drop zone (via a synthetic `DataTransfer` drop). Also covers in-memory buffers, upload progress, error messages, accepted types and removal.',
    blocks: [
      {
        type: 'code',
        caption: 'Three paths, one component',
        text: `await upload.upload('files/sample.txt');                  // set files directly
await upload.uploadViaFileChooser('files/sample.txt');    // real user path through the dialog
await upload.dropFile('report.csv', 'text/csv', 'a,b\\n1,2'); // drag and drop
await upload.uploadBuffer('big.bin', 'application/octet-stream', Buffer.alloc(5_000_000));`,
      },
    ],
    changeWhen: [
      'Your file list, progress bar or error container uses different markup, or a new upload gesture appears.',
    ],
    changeHow: [
      {
        text: 'Pass the selectors at construction; use `createFileOfSize()` from the file utilities for size-boundary tests rather than committing large binaries.',
        code: `const tooBig = await createFileOfSize('over-limit.pdf', 11 * 1024 * 1024);
await upload.upload(tooBig);
expect(await upload.getErrorMessage()).toContain('10 MB');`,
      },
    ],
    why: 'Setting files directly works even when the input is hidden, but only the file-chooser path exercises the button a user actually clicks. Both are provided because they test different things.',
    related: ['src/utils/file.utils.ts'],
  },

  'src/components/form/date-picker.ts': {
    group: 'components-form',
    title: 'DatePicker',
    purpose:
      'Covers both interaction paths: typing into the input, and navigating the calendar popup month by month. Also supports ranges, reading the displayed month, and checking whether a date is disabled.',
    changeWhen: [
      'Your calendar markup, month navigation controls or input format differ from the defaults.',
    ],
    changeHow: [
      {
        text: 'Configure the format and selectors once at construction.',
        code: `ui.datePicker('#depart', {
  inputFormat: 'DD/MM/YYYY',
  calendarSelector: '.rdp',
  daySelector: '.rdp-day:not(.rdp-day_disabled)',
  nextMonthSelector: '.rdp-nav_button_next',
});`,
      },
      {
        text: 'Prefer `typeDate()` when the field accepts typing — it is faster and far less brittle than paging a calendar.',
      },
    ],
    why: 'Month navigation is bounded to 24 hops so a mis-parsed month fails with a clear message instead of looping forever.',
    gotchas: [
      '`inputFormat` must match what the application expects, or the field will silently reject the typed value.',
    ],
    related: ['src/utils/date.utils.ts'],
  },

  'src/components/form/toggle.ts': {
    group: 'components-form',
    title: 'Toggle',
    purpose:
      'Switches: `role="switch"`, styled checkboxes, or a pair of divs. State is read from the native `checked` property, then `aria-checked`, then `aria-pressed`, then class names — so it works across design systems. `turnOn` and `turnOff` are idempotent.',
    changeWhen: [
      'Your switch signals state only through a class name the default pattern does not match.',
    ],
    changeHow: [
      {
        text: 'Extend the class-name pattern in `isOn()`, or better, ask for `aria-checked` to be added — it fixes the test and the accessibility of the control at once.',
      },
    ],
    why: 'Checking several state signals in priority order is what lets one class serve MUI, Ant, Bootstrap and hand-rolled switches.',
    related: ['src/components/form/checkbox.ts'],
  },

  'src/components/form/slider.ts': {
    group: 'components-form',
    title: 'Slider',
    purpose:
      'Range inputs and `role="slider"` controls, with three strategies because custom sliders rarely honour all of them: setting the value through the native setter (firing the events frameworks listen for), dragging the handle proportionally, and stepping with arrow keys.',
    changeWhen: [
      'A custom slider ignores `setValue()` — that method requires a native range input.',
    ],
    changeHow: [
      {
        text: 'Fall back to `dragToValue()` or `stepBy()`, which work for any implementation.',
        code: `await volume.dragToValue(75);
await volume.stepBy(3);   // three ArrowRight presses`,
      },
    ],
    why: 'React and similar frameworks track the native value setter, so assigning `element.value` directly is ignored. Calling the prototype setter is what makes the framework see the change.',
    related: ['src/components/feedback/progress.ts'],
  },

  'src/components/form/rating.ts': {
    group: 'components-form',
    title: 'Rating',
    purpose:
      'Star and heart rating controls: rating by position, reading the current and maximum rating, hover preview, read-only detection and clearing.',
    changeWhen: [
      'Your rating items are not `[role="radio"]`, `.star`, `li` or `svg`, or selection is signalled by an unusual class.',
    ],
    changeHow: [
      {
        text: 'Pass `itemSelector` and `selectedClassPattern` at construction.',
        code: `ui.rating('.product-rating', { itemSelector: '.rating-icon', selectedClassPattern: /is-filled/ });`,
      },
    ],
    why: 'Reading `aria-valuenow` first means a properly labelled widget needs no configuration at all.',
    related: [],
  },

  'src/components/form/color-picker.ts': {
    group: 'components-form',
    title: 'ColorPicker',
    purpose:
      'Native `<input type="color">` and custom swatch pickers: setting a hex value with the events frameworks expect, reading the value, picking a named swatch, and reading the rendered colour.',
    changeWhen: ['Your palette markup differs, or the picker is a canvas-based gradient.'],
    changeHow: [
      {
        text: 'Pass a swatch selector to `pickSwatch()`; for canvas-based pickers use the `Canvas` component and click a coordinate.',
      },
    ],
    why: 'Setting a native colour input directly avoids driving an OS-level colour dialog, which no browser automation can control.',
    related: ['src/components/media/canvas.ts'],
  },

  'src/components/form/form.ts': {
    group: 'components-form',
    title: 'Form (composite)',
    purpose:
      'Treats a whole `<form>` as one component. `fill()` takes a plain object keyed by field label and drives each control with the right interaction, inferring the control type from the DOM — which is what stops page objects accumulating twenty near-identical setter methods. Also exposes submit, reset, current values, error messages, browser validity, invalid field names and tab order.',
    blocks: [
      {
        type: 'code',
        caption: 'A twenty-field form is one object literal',
        text: `await signupForm.fill({
  'Full name': 'Ada Lovelace',
  Country: 'Nigeria',       // native select or custom dropdown — both work
  'Accept terms': true,     // checkbox or switch
  Avatar: 'files/photo.png' // file input
});
await signupForm.submit();
expect(await signupForm.getErrors()).toHaveLength(0);`,
      },
    ],
    changeWhen: [
      'A field cannot be found by label, placeholder, name or test id.',
      'Your application introduces a control type the inference does not recognise.',
    ],
    changeHow: [
      {
        text: 'For one awkward field, pass a spec with an explicit selector and kind.',
        code: `await form.fill(
  { Country: 'Nigeria' },
  { Country: { kind: 'dropdown', selector: '[data-testid="country-combobox"]' } },
);`,
      },
      {
        text: 'To support a new control type everywhere, add it to the `FieldKind` union, to `inferKind()` and to the `switch` in `setField()`.',
        code: `case 'rating':
  await new Rating(this.page, field, { name: label }).rate(Number(value));
  break;`,
      },
    ],
    why: 'Filling forms is the single most repeated action in UI testing. Making it data-driven collapses the largest source of page-object boilerplate and makes data-driven test cases trivial.',
    gotchas: [
      '`fieldByLabel()` tries label, then placeholder, then `name`/`data-testid`. If a form has two fields with the same label, pass an explicit selector.',
    ],
    related: ['src/components/form/dropdown.ts', 'src/components/form/checkbox.ts'],
  },
};
