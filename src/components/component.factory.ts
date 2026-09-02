import type { Page } from '@playwright/test';
import type { Scope } from '../core/locator.factory';
import type { ComponentOptions, SelectorLike } from '../types';

import { Button } from './form/button';
import { TextInput } from './form/text-input';
import { TextArea } from './form/text-area';
import { Checkbox } from './form/checkbox';
import { RadioGroup } from './form/radio-group';
import { Select } from './form/select';
import { Dropdown, type DropdownOptions } from './form/dropdown';
import { MultiSelect, type MultiSelectOptions } from './form/multi-select';
import { Autocomplete, type AutocompleteOptions } from './form/autocomplete';
import { FileUpload, type FileUploadOptions } from './form/file-upload';
import { DatePicker, type DatePickerOptions } from './form/date-picker';
import { Toggle } from './form/toggle';
import { Slider } from './form/slider';
import { Rating, type RatingOptions } from './form/rating';
import { ColorPicker } from './form/color-picker';
import { Form } from './form/form';
import { Table, type TableOptions } from './data/table';
import { DataGrid, type DataGridOptions } from './data/data-grid';
import { ListView, type ListOptions } from './data/list';
import { TreeView, type TreeOptions } from './data/tree';
import { Pagination, type PaginationOptions } from './data/pagination';
import { Card, type CardOptions } from './data/card';
import { Link } from './navigation/link';
import { Tabs, type TabsOptions } from './navigation/tabs';
import { Accordion, type AccordionOptions } from './navigation/accordion';
import { Menu, type MenuOptions } from './navigation/menu';
import { Breadcrumb, type BreadcrumbOptions } from './navigation/breadcrumb';
import { Stepper, type StepperOptions } from './navigation/stepper';
import { Modal, type ModalOptions } from './feedback/modal';
import { Alert, type AlertOptions } from './feedback/alert';
import { Tooltip, type TooltipOptions } from './feedback/tooltip';
import { Loader, ProgressBar } from './feedback/progress';
import { Image } from './media/image';
import { MediaPlayer } from './media/media-player';
import { Canvas } from './media/canvas';
import { Frame } from './media/frame';
import { Carousel, type CarouselOptions } from './media/carousel';
import { Draggable, DropZone } from './advanced/drag-drop';
import { ShadowHost } from './advanced/shadow-dom';
import { RichTextEditor, type RichTextEditorOptions } from './advanced/rich-text-editor';
import { InfiniteScroll, type InfiniteScrollOptions } from './advanced/infinite-scroll';
import { Chart, type ChartOptions } from './advanced/chart';

/**
 * Ergonomic factory bound to a scope (a page, a frame or a container locator).
 *
 * Page objects use this instead of calling constructors directly:
 *
 *   private readonly ui = ui(this.page);
 *   readonly submit = this.ui.button('#submit', { name: 'Submit order' });
 *
 * Scoping to a container keeps selectors short and prevents cross-widget
 * strict-mode collisions:
 *
 *   const dialog = ui(page.locator('#confirm-dialog'));
 */
export class UiFactory {
  constructor(private readonly scope: Scope) {}

  /** Re-scopes the factory to a container within the current scope. */
  within(selector: string): UiFactory {
    return new UiFactory((this.scope as Page).locator(selector));
  }

  /* form */
  button = (selector: SelectorLike, options?: ComponentOptions): Button =>
    new Button(this.scope, selector, options);
  input = (selector: SelectorLike, options?: ComponentOptions): TextInput =>
    new TextInput(this.scope, selector, options);
  textarea = (selector: SelectorLike, options?: ComponentOptions): TextArea =>
    new TextArea(this.scope, selector, options);
  checkbox = (selector: SelectorLike, options?: ComponentOptions): Checkbox =>
    new Checkbox(this.scope, selector, options);
  radioGroup = (selector: SelectorLike, options?: ComponentOptions): RadioGroup =>
    new RadioGroup(this.scope, selector, options);
  select = (selector: SelectorLike, options?: ComponentOptions): Select =>
    new Select(this.scope, selector, options);
  dropdown = (selector: SelectorLike, options?: DropdownOptions): Dropdown =>
    new Dropdown(this.scope, selector, options);
  multiSelect = (selector: SelectorLike, options?: MultiSelectOptions): MultiSelect =>
    new MultiSelect(this.scope, selector, options);
  autocomplete = (selector: SelectorLike, options?: AutocompleteOptions): Autocomplete =>
    new Autocomplete(this.scope, selector, options);
  fileUpload = (selector: SelectorLike, options?: FileUploadOptions): FileUpload =>
    new FileUpload(this.scope, selector, options);
  datePicker = (selector: SelectorLike, options?: DatePickerOptions): DatePicker =>
    new DatePicker(this.scope, selector, options);
  toggle = (selector: SelectorLike, options?: ComponentOptions): Toggle =>
    new Toggle(this.scope, selector, options);
  slider = (selector: SelectorLike, options?: ComponentOptions): Slider =>
    new Slider(this.scope, selector, options);
  rating = (selector: SelectorLike, options?: RatingOptions): Rating =>
    new Rating(this.scope, selector, options);
  colorPicker = (selector: SelectorLike, options?: ComponentOptions): ColorPicker =>
    new ColorPicker(this.scope, selector, options);
  form = (selector: SelectorLike, options?: ComponentOptions): Form =>
    new Form(this.scope, selector, options);

  /* data */
  table = (selector: SelectorLike, options?: TableOptions): Table =>
    new Table(this.scope, selector, options);
  dataGrid = (selector: SelectorLike, options?: DataGridOptions): DataGrid =>
    new DataGrid(this.scope, selector, options);
  list = (selector: SelectorLike, options?: ListOptions): ListView =>
    new ListView(this.scope, selector, options);
  tree = (selector: SelectorLike, options?: TreeOptions): TreeView =>
    new TreeView(this.scope, selector, options);
  pagination = (selector: SelectorLike, options?: PaginationOptions): Pagination =>
    new Pagination(this.scope, selector, options);
  card = (selector: SelectorLike, options?: CardOptions): Card =>
    new Card(this.scope, selector, options);

  /* navigation */
  link = (selector: SelectorLike, options?: ComponentOptions): Link =>
    new Link(this.scope, selector, options);
  tabs = (selector: SelectorLike, options?: TabsOptions): Tabs =>
    new Tabs(this.scope, selector, options);
  accordion = (selector: SelectorLike, options?: AccordionOptions): Accordion =>
    new Accordion(this.scope, selector, options);
  menu = (selector: SelectorLike, options?: MenuOptions): Menu =>
    new Menu(this.scope, selector, options);
  breadcrumb = (selector: SelectorLike, options?: BreadcrumbOptions): Breadcrumb =>
    new Breadcrumb(this.scope, selector, options);
  stepper = (selector: SelectorLike, options?: StepperOptions): Stepper =>
    new Stepper(this.scope, selector, options);

  /* feedback */
  modal = (selector: SelectorLike, options?: ModalOptions): Modal =>
    new Modal(this.scope, selector, options);
  alert = (selector: SelectorLike, options?: AlertOptions): Alert =>
    new Alert(this.scope, selector, options);
  tooltip = (selector: SelectorLike, options?: TooltipOptions): Tooltip =>
    new Tooltip(this.scope, selector, options);
  progressBar = (selector: SelectorLike, options?: ComponentOptions): ProgressBar =>
    new ProgressBar(this.scope, selector, options);
  loader = (selector: SelectorLike, options?: ComponentOptions): Loader =>
    new Loader(this.scope, selector, options);

  /* media */
  image = (selector: SelectorLike, options?: ComponentOptions): Image =>
    new Image(this.scope, selector, options);
  media = (selector: SelectorLike, options?: ComponentOptions): MediaPlayer =>
    new MediaPlayer(this.scope, selector, options);
  canvas = (selector: SelectorLike, options?: ComponentOptions): Canvas =>
    new Canvas(this.scope, selector, options);
  carousel = (selector: SelectorLike, options?: CarouselOptions): Carousel =>
    new Carousel(this.scope, selector, options);
  /** Frames are scopes, not components — pass `frame.locator` to other builders. */
  frame = (selector: string): Frame => new Frame(this.scope as Page, selector);

  /* advanced */
  draggable = (selector: SelectorLike, options?: ComponentOptions): Draggable =>
    new Draggable(this.scope, selector, options);
  dropZone = (selector: SelectorLike, options?: ComponentOptions): DropZone =>
    new DropZone(this.scope, selector, options);
  shadowHost = (selector: SelectorLike, options?: ComponentOptions): ShadowHost =>
    new ShadowHost(this.scope, selector, options);
  richText = (selector: SelectorLike, options?: RichTextEditorOptions): RichTextEditor =>
    new RichTextEditor(this.scope, selector, options);
  infiniteScroll = (selector: SelectorLike, options?: InfiniteScrollOptions): InfiniteScroll =>
    new InfiniteScroll(this.scope, selector, options);
  chart = (selector: SelectorLike, options?: ChartOptions): Chart =>
    new Chart(this.scope, selector, options);
}

/** Creates a UI factory bound to a page, frame or container locator. */
export function ui(scope: Scope): UiFactory {
  return new UiFactory(scope);
}
