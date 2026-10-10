# ADOFAI-IPC v2 integration

This web client vendors the canonical ADOFAI-IPC 2.0.0 browser SDK under `src/vendor/adofai-ipc`. `npm run sdk:check` verifies it against its pinned source metadata. The paired TUFHelperLite mod bundles Contracts, Loader and the process runtime; this repository ships browser sources.

The connection uses WebSocket wire major 3 and declares `connection.namespace('tufhelperlite', 1)`. Missing or different feature majors produce `feature_protocol_mismatch` before domain traffic. Update the mod and web client together and restart the game after installing a v2 mod package.

Existing commands, DTO casing, correlation IDs, cancellation and reconnect behavior are retained. `npm run test:ipc` covers session lifecycle, readiness, foreground recovery and replay delivery. Actual Unity/Mono multi-mod loading still requires an in-game check before release.
