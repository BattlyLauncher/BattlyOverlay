# Host integration, protocol 1

The embedding Electron application creates a sandboxed, isolated BrowserWindow,
loads `renderer/worlds-overlay.html` from a verified package and supplies
`window.worldsOverlay` through a local preload. The full TypeScript contract is
`src/shared/social/worlds-overlay-api.ts`. Do not expose arbitrary IPC invocation,
filesystem access, account tokens or a raw network client to the renderer.

The bridge supplies room snapshots, commands, friend lists, language and appearance
settings. Voice commands go to the host's voice implementation; the overlay never
receives TURN credentials or microphone streams. `faceImageUrl` returns a Promise
containing PNG data, not an account-service URL. All ten translations are bundled.
The page's CSP blocks network connections and permits only local/data images.

Validate the sending webContents **and** its main-frame URL before handling any
command. Deny navigation and new windows. Apply account access restrictions in the
host. Keep this preload in the host's own signed/reviewed distribution: it is not
part of a downloaded overlay package.

Start `WindowTracker[.exe] GAME_PID OVERLAY_WINDOW_ID HOST_PID` without a shell.
Windows uses the HWND, X11 the XID, and macOS the window ID from Electron's
`getMediaSourceId()`, not the NSView pointer from `getNativeWindowHandle()`.
Stdout contains JSON lines at most four times a second:

```json
{"visible":true,"fullscreen":false,"exclusiveFullscreen":false,"x":100,"y":80,"width":1280,"height":720}
```

`{"visible":false}` hides the HUD without discarding the last rectangle.
`{"mode":"companion"}` requests a normal companion window. Reject malformed or
oversized frames. Stop the helper and unregister only your own shortcuts when the
game stops. Ignore a completed download belonging to an earlier game session.

Windows coordinates are physical pixels; convert with `screen.screenToDipRect`.
Quartz coordinates are screen points. X11 coordinates follow the X server; test
your compositor's scaling configuration. Do not capture clicks while the HUD is
hidden or in a presentation mode where it cannot be seen.

The Battly-specific authenticated adapter remains in the launcher repository.
This project contains no account service, account keys or server endpoints.
