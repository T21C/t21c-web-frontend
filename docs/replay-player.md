# Replay host

`PassReplay` opens the separately deployed web-adofai player using
`VITE_WEB_ADOFAI_URL`. The host sends only `runId`, `passId` and `levelId` after the
iframe's protocol-3 `player.ready` handshake. It checks source window, exact origin,
protocol and session ID. On close/unmount it sends `host.dispose`.

The player owns all network downloads, replay formats, source compatibility,
integrity validation, loading/errors/retries, timeline and audio controls. Do not
reintroduce those schemas or payload buffers in this frontend. Future player events
may be ignored; `player.close` closes the host container.

The host retains its heading, expand/collapse and close controls. Their shared icon
button styling is in `pass-replay.css`, independently of player controls.
The inline container reserves a 16:9 game area plus 82 CSS pixels for controls from
the initial closed state onward (104 pixels when the container is at most 480 pixels
wide). The player uses the same fixed control space. No post-load measurements or
player messages resize the iframe. Keep these dimensions in sync with the player's
`replay-page.css`; the breakpoint uses container width to match the iframe viewport.
Expanded mode fits the available window instead. Fullscreen is owned by this host, not duplicated in
the iframe toolbar; volume preferences are stored by the player across runs.

Beta testing can open `<player-origin>/replay?runId=<uuid>` directly. Environment and
CORS configuration for replay APIs now belongs to the player and serving APIs.
