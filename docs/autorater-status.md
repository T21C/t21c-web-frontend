# AutoRater status on rating cards

The AutoRater card fetches a compact status as soon as it mounts, including while
its analysis iframe is collapsed. It calls the configured
`VITE_AUTORATER_WIDGET_URL` origin (default `https://www.auto-rater-cat.com`):

`GET /embed/tuf/{levelId}/status?rating={displayedVote}`

This uses the level ID passed to `RatingItem`, not the rating-request ID in the
page URL. Requests omit credentials, time out after eight seconds, and share
in-flight work. Completed responses are not cached in the browser client, so
reopening the rating checks again. A late response for another level or vote is
ignored. The website service must allow the TUF origin through
`ARC_EMBED_ORIGINS`; the existing standalone rating-result API is unchanged.

The API's `outdated` is true/false/null. Missing saved records are outdated with
reason `missing_record`; warnings remain unknown until scanned. Null and network
errors display an unknown/unavailable state, never "not outdated". Warning count zero
only displays "None" when `warnings_status` is `complete`; partial/stale scans
remain visibly qualified. Missing website records can be generated in the
analysis iframe; the TUF vote by itself does not create a website record.

Difficulty and warnings are colored independently: current difficulty is green,
outdated difficulty is yellow, warnings (including preview/reasons) are yellow,
and no warnings or unknown states are gray. The component inherits TUF's Roboto font.
Warnings use a two-line preview with a native keyboard-accessible details control.
Opening it reveals all labels and reasons in a list capped at 12rem with vertical
scrolling and long-word wrapping. Clicking it does not toggle the analysis iframe.
React renders warning content as text. API errors offer a retry without hiding the
original rating.

Local verification:

```powershell
node --test tests/autorater.test.js tests/autorater-status.test.js
node node_modules/eslint/bin/eslint.js src/components/cards/RatingItem/AutoraterStatus.jsx src/components/cards/RatingItem/RatingItem.jsx src/utils/autoraterStatus.js
```

The companion hosting implementation and its saved-record status endpoint must
be available before this frontend integration is deployed. The backend companion
change defaults generation to the durable website `/rating-result` endpoint;
existing `AUTORATER_API_URL` overrides must also point to the website origin.
