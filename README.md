# Battly Overlay

The room, invitations and voice controls shown beside Minecraft in Battly Worlds.
This repository contains the interface, its shared contract and the native helpers
that follow the game window. The launcher owns accounts, networking and audio.

## Platform support

| Platform | Mode | Build targets |
| --- | --- | --- |
| Windows | HUD attached to the game window | x64, x86 |
| Linux with X11 | HUD using EWMH window metadata | x64, ARM64 |
| Linux with Wayland | Separate companion panel | x64, ARM64 |
| macOS 12 or later | HUD using Quartz window metadata | Intel, Apple Silicon |

A desktop overlay cannot promise visibility over every exclusive fullscreen game.
Windows hides it when exclusive presentation is reported. On macOS the host must
allow the window on fullscreen Spaces. Wayland deliberately restricts global window
tracking; the companion panel keeps room and voice controls available.

No helper injects a DLL, hooks input, reads game memory or captures the screen.
It observes the selected process/window and exits when the game or host exits.
Mixed DPI, window-manager policies and macOS permissions require native testing;
building a target alone does not establish that every game/compositor works.

## Build

Use Node.js 22.13 or later and run:

```sh
npm ci
npm run check:public
npm run typecheck
npm test
npm run build
npm run build:native
npm run package
```

Windows requires the .NET Framework C# compiler. Linux requires a C++17 compiler
and X11 development headers. macOS requires Xcode Command Line Tools. Pass a target
to the last two commands, for example `npm run build:native -- darwin-arm64`.
Linux targets build on their native architecture; macOS supports either architecture
from one Mac. UI assets are shared across platforms.

After building, `npm run demo` opens a local preview with sample room data.
`npm run test:smoke` checks the interface and native tracker against that window.
Neither command signs in, joins a real room or starts Minecraft.

## Releases and launcher integration

Pull requests build and check all six targets. A push to `main` publishes the
version in `VERSION` after all targets pass. `package.json` must have that same
version. Existing published versions are never overwritten. GitHub Actions uses
the repository's built-in token; no service credentials are needed.

Each release has six ZIPs, `manifest.json`, `SHA256SUMS` and GitHub build provenance.
See [the release contract](docs/releases.md) and [host integration](docs/host.md).
The launcher pins a compatible version, verifies downloads, and reuses verified
files offline. It does not execute whichever release happens to be latest.

The code is public for inspection under the terms in [LICENSE](LICENSE).
Battly branding and third-party assets retain their respective rights.
