# AutoRater V2

The existing AutoRater account uses `src/assets/icons/autorater-v2.png` in its
rating card and in the super-admin autorate button. Human rating cards retain
their avatars and comments. The identity check is shared with the rank-ready list.

The card displays the saved `rating` verbatim. The backend V2 integration stores
the API's `rating_result`, for example `U7 high (U8, U7, U6, U7)`.

Expanding an AutoRater card loads `https://www.auto-rater-cat.com/embed/tuf/{levelId}`
instead of the legacy reason text. Use the level ID, not the rating record ID.
The iframe is mounted only when expanded. Its resize messages must match the
origin, frame window, message type and selected level, with height bounded to
300–2400 px. The enclosing popup scrolls naturally when analysis is expanded.
The AutoRater pane stays content-sized when collapsed, including on mobile;
its layout marker remains present after the iframe is unmounted.

On a level detail page, clicking the difficulty icon opens the score graph.
The **Auto Rater Cat v2** button beside **Score vs accuracy** opens the same
fixed-level widget in a scrollable popup, using the level's ID and the V2 icon.
The iframe mounts only while the popup is open. Closing it returns focus to
the button and leaves the graph's Misses and Disable PP settings intact.
The close button, backdrop, and Escape from the parent page dismiss the popup;
changing levels clears the selected analysis. This entry point is public and
does not require a saved AutoRater rating or changes to the TUF backend.

`VITE_AUTORATER_WIDGET_URL` optionally overrides the widget origin for development.
That widget server must explicitly allow the host origin in its frame policy.
The public widget already permits `https://tuforums.com` and `https://www.tuforums.com`.
Do not remove its frame policy to make local development work. If the host adds a
CSP, include the widget origin in `frame-src`.

The iframe has its own versioned rating store. A missing or outdated analysis can
be rated from inside the widget; that operation does not update TUF's saved rating.
The existing super-admin cat button updates the saved TUF summary through the backend.
Old summaries remain until rerated; this frontend does not perform a batch backfill.

Validation: `node --test tests/autorater.test.js`, lint changed files, and build
the frontend. Check expanded/collapsed cards, level switching, mobile width,
and the super-admin rerate action with the V2 backend. For the level-page entry
point, test `/levels/1` and another level, open Difficulty → Auto Rater Cat v2,
check the iframe URL, close/reopen, and verify the header and popup at mobile width.
