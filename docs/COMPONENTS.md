# Component reference

Every component extends `BaseComponent`, so all of them support the shared API
first, then add their own behaviour.

Build components with the factory rather than constructors:

```ts
import { ui } from '@components/index';

const factory = ui(page); // page-scoped
const dialog = ui(page.locator('#confirm')); // container-scoped
const inFrame = ui(new Frame(page, '#pay').locator); // iframe-scoped
```

## Shared API (BaseComponent)

**Actions** `click` · `doubleClick` · `rightClick` · `forceClick` · `hover` ·
`focus` · `blur` · `pressKey` · `dragTo` · `scrollIntoView`

**State** `isVisible` · `isHidden` · `isEnabled` · `isDisabled` · `isEditable` ·
`isChecked` · `isFocused` · `exists` · `count` · `getText` · `getAllTexts` ·
`getInputValue` · `getAttribute` · `getCssValue` · `hasClass` ·
`getBoundingBox` · `getAccessibleName` · `getState`

**Waits** `waitForVisible` · `waitForHidden` · `waitForAttached` ·
`waitForDetached` · `waitForEnabled` · `waitForText` · `waitForStable`

**Assertions** `expectVisible` · `expectHidden` · `expectEnabled` ·
`expectDisabled` · `expectText` · `expectContainsText` · `expectValue` ·
`expectAttribute` · `expectCount` · `expectFocused`

**Narrowing** `nth(n)` (1-based) · `first()` · `filterByText(text)`

**Diagnostics** `highlight` · `screenshot` · `innerHTML` · `describe`

---

## Form controls

| Component      | Covers                                             | Notable methods                                                                                                                                             |
| -------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`       | button, input[type=submit], role=button            | `clickWhenReady`, `clickAndNavigate`, `clickAndWaitForCompletion`, `isLoading`                                                                              |
| `TextInput`    | text/email/password/number/search, contenteditable | `type`, `append`, `clear`, `clearWithKeyboard`, `typeAndSettle`, `paste`, `getValidationMessage`, `getErrorMessage`, `hasError`, `isRequired`, `isReadOnly` |
| `TextArea`     | multi-line fields                                  | `typeLines`, `getCharacterCount`, `isResizable`                                                                                                             |
| `Checkbox`     | native and ARIA checkboxes                         | `check`, `uncheck`, `toggle`, `set`, `isCheckedState`, `isIndeterminate`, `getLabelText`                                                                    |
| `RadioGroup`   | radio sets                                         | `selectByValue`, `selectByLabel`, `selectByIndex`, `getSelectedValue`, `getOptionLabels`, `selectWithKeyboard`                                              |
| `Select`       | native `<select>`                                  | `selectByValue/Label/Index`, `getOptions`, `isMultiple`, `clearSelection`                                                                                   |
| `Dropdown`     | React-Select, MUI, Ant, Kendo                      | `open`, `close`, `selectOption`, `search`, `getOptions`, `selectWithKeyboard`                                                                               |
| `MultiSelect`  | tag/chip inputs                                    | `selectMany`, `getSelectedItems`, `removeItem`, `clearAll`, `removeLastWithKeyboard`                                                                        |
| `Autocomplete` | typeahead with async results                       | `search`, `searchAndSelect`, `selectFirstSuggestion`, `getSuggestions`, `hasNoResults`, `getHighlightedSuggestion`                                          |
| `FileUpload`   | input, hidden input, drop zone                     | `upload`, `uploadViaFileChooser`, `uploadBuffer`, `dropFile`, `waitForUploadComplete`, `getAcceptedTypes`                                                   |
| `DatePicker`   | text entry and calendar popup                      | `typeDate`, `pickDate`, `pickRange`, `navigateToMonth`, `isDateDisabled`                                                                                    |
| `Toggle`       | role=switch, styled checkboxes                     | `turnOn`, `turnOff`, `set`, `isOn`, `toggleWithKeyboard`                                                                                                    |
| `Slider`       | input[type=range], role=slider                     | `setValue`, `dragToValue`, `stepBy`, `setToMin/Max`, `getPercentage`                                                                                        |
| `Rating`       | star/heart widgets                                 | `rate`, `getRating`, `hoverRating`, `isReadOnly`                                                                                                            |
| `ColorPicker`  | input[type=color], swatches                        | `setColor`, `getColor`, `pickSwatch`, `getRenderedColor`                                                                                                    |
| `Form`         | a whole form                                       | `fill(data)`, `setField`, `submit`, `reset`, `getValues`, `getErrors`, `getInvalidFields`, `getTabOrder`                                                    |

`Form.fill()` drives each control with the right interaction, inferred from the
DOM — so a twenty-field form is one object literal:

```ts
await ui(page).form('#signup').fill({
  'Full name': 'Ada Lovelace',
  Country: 'Nigeria', // <select> or custom dropdown, both work
  'Accept terms': true, // checkbox or switch
  Avatar: '/path/to.png', // file input
});
```

## Data display

| Component    | Covers                                | Notable methods                                                                                                                                                     |
| ------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Table`      | HTML tables                           | `getAllRows`, `getRow`, `getCellText`, `getColumnValues`, `findRowIndex`, `containsRow`, `clickRowAction`, `sortBy`, `isColumnSorted`, `selectRow`, `selectAllRows` |
| `DataGrid`   | AG Grid, MUI DataGrid, Kendo, PrimeNG | everything in `Table` plus `waitForData`, `scrollToRow`, `getAllRowsVirtualized`, `filterColumn`, `resizeColumn`, `reorderColumn`, `expandRow`, `editCell`          |
| `ListView`   | ul/ol, role=list, card collections    | `getItems`, `clickItem`, `hasItem`, `getItemIndex`, `isOrderedAs`                                                                                                   |
| `TreeView`   | role=tree, file explorers             | `expand`, `collapse`, `expandPath`, `select`, `isSelected`, `getLevel`, `getChildren`                                                                               |
| `Pagination` | page controls                         | `goToNext/Previous/First/Last/Page`, `getCurrentPage`, `getTotalPages`, `setPageSize`, `forEachPage`                                                                |
| `Card`       | product/dashboard tiles               | `withTitle`, `getTitle`, `getBody`, `getPrice`, `clickAction`, `getAllTitles`                                                                                       |

Everything in `Table` is addressable by **column name**, not index — the reason
inserting a column does not break a hundred tests.

## Navigation

| Component    | Notable methods                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `Link`       | `getHref`, `opensInNewTab`, `clickAndWait`, `clickAndGetNewTab`, `isReachable`, `isExternal`                               |
| `Tabs`       | `select`, `getActiveTab`, `getTabNames`, `isTabActive`, `isTabDisabled`, `activePanel`, `panelFor`, `navigateWithKeyboard` |
| `Accordion`  | `expand`, `collapse`, `toggle`, `isExpanded`, `getContent`, `expandAll`, `collapseAll`, `getExpandedCount`                 |
| `Menu`       | `clickItem`, `navigateTo(['Reports','Sales','By region'])`, `getItemNames`, `isItemDisabled`, `openContextMenu`            |
| `Breadcrumb` | `getTrail`, `getCurrent`, `navigateTo`, `goUp`, `depth`                                                                    |
| `Stepper`    | `next`, `back`, `finish`, `goToStep`, `getCurrentStep`, `isStepCompleted`, `isLastStep`                                    |

## Feedback

| Component     | Notable methods                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Modal`       | `waitForOpen/Close`, `getTitle`, `getBodyText`, `confirm`, `cancel`, `close`, `closeWithEscape`, `clickOverlay`, `isFocusTrapped`, `hasCorrectAriaSemantics` |
| `Alert`       | `waitForMessage`, `getMessage`, `getAllMessages`, `getSeverity`, `dismiss`, `dismissAll`, `waitForAutoDismiss`, `isAnnouncedToScreenReaders`                 |
| `Tooltip`     | `show`, `hide`, `getText`, `getNativeTitle`, `getPlacement`, `isAccessiblyLinked`                                                                            |
| `ProgressBar` | `getValue`, `getPercentage`, `isIndeterminate`, `waitForComplete`, `waitForProgress`                                                                         |
| `Loader`      | `waitForFinish`, `isLoading`, `around(action)`                                                                                                               |

`Alert.waitForMessage()` races the auto-dismiss timer instead of assuming the
toast is still on screen — the classic source of flaky toast assertions.

## Media

| Component     | Notable methods                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Image`       | `isLoaded`, `waitForLoaded`, `getNaturalSize`, `isBroken`, `isLazyLoaded`, `getSrcSet`, `hasAccessibleAlt`                    |
| `MediaPlayer` | `play`, `pause`, `seekTo`, `setVolume`, `mute`, `setPlaybackRate`, `waitForReady`, `waitForPlaybackProgress`, `getTextTracks` |
| `Canvas`      | `draw`, `drawLine`, `scribble`, `clickAt`, `getPixelColor`, `isBlank`, `toDataUrl`                                            |
| `Carousel`    | `next`, `previous`, `goToSlide`, `getCurrentSlideIndex`, `waitForAutoAdvance`, `swipe`                                        |
| `Frame`       | a _scope_, not a component: pass `frame.locator` to any other component                                                       |

## Advanced interactions

| Component        | Notable methods                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Draggable`      | `dragTo` (built-in), `dragManually` (mouse steps — works with react-dnd/dnd-kit/Sortable), `dragWithDataTransfer` (synthetic HTML5 events), `dragBy`, `dragWithKeyboard` |
| `DropZone`       | `isActive`, `getDroppedItems`, `containsItem`                                                                                                                            |
| `ShadowHost`     | `inShadow`, `hasShadowRoot`, `getShadowMode`, `getShadowText`, `clickInShadow`, `getSlottedContent`, `listCustomElements`                                                |
| `RichTextEditor` | Quill/TinyMCE/CKEditor/ProseMirror: `typeText`, `setContent`, `getHtml`, `selectText`, `clickToolbarButton`, `bold/italic/underline`, `hasFormatting`, `getWordCount`    |
| `InfiniteScroll` | `loadMore`, `loadAll(maxScrolls)`, `scrollToItem`, `hasReachedEnd`                                                                                                       |
| `Chart`          | `dataPointCount`, `hoverDataPoint`, `clickDataPoint`, `getLegendItems`, `toggleSeries`, `getAxisLabels`, `getBarHeights`, `getAccessibleDescription`                     |

Drag-and-drop ships three strategies deliberately: no single approach works
across every DnD library, and discovering that mid-sprint is expensive.

## Custom matchers

From `@fixtures/index`:

```ts
await expect(page).toBeAccessible({ tags: ['wcag2aa'] });
await expect(locator).toBeInteractive();
await expect(locator).toHaveNormalizedText('Total  due'); // whitespace-insensitive
await expect(locator).toHaveValidationError(/required/i);
await expect(locator).toBeInViewport();
expect(await table.getColumnValues('Amount')).toBeSorted('desc');
```

## Adding a component

1. Create the file under the right `src/components/<group>/` folder.
2. Extend `BaseComponent` (or an existing component — `DataGrid` extends `Table`).
3. Override `componentType` for logs and step titles.
4. Take a typed options interface extending `ComponentOptions` for its selectors,
   with sensible defaults, so the same class serves multiple UI libraries.
5. Wrap each public action in `this.step('...', async () => { ... })`.
6. Export it from `src/components/index.ts` and add a factory method in
   `component.factory.ts`.
