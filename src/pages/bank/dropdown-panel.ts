/**
 * The selector every custom dropdown in SecureBank shares.
 *
 * ---------------------------------------------------------------------------
 * WHY `:visible` IS LOAD-BEARING
 * ---------------------------------------------------------------------------
 * The application renders each dropdown's panel as a `[role="listbox"]` and
 * **leaves it in the DOM when it closes**, merely hidden. So on the transfer
 * page, once the "From" dropdown has been used there are two listboxes: the
 * closed one and the one being opened.
 *
 * A plain `[role="listbox"]` therefore resolves to the *first* match — the
 * hidden one — and the Dropdown component waits for it to become visible until
 * it times out. The failure message says "waiting for [role=listbox] to be
 * visible" while a perfectly good panel is open a few pixels away, which is
 * about as misleading as a failure can be.
 *
 * `:visible` is Playwright's own pseudo-class and resolves to the open panel,
 * whichever it is. It is used in preference to a per-dropdown container test id
 * because the application only provides those inconsistently — some panels have
 * one, several do not.
 */
export const VISIBLE_LISTBOX = '[role="listbox"]:visible';
