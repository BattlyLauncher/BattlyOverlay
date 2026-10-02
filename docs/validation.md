# Desktop validation

Checked on 3 October 2026 before the initial public release.

| Environment | Executed checks |
| --- | --- |
| Ubuntu 22.04.5 x64, kernel 5.15, VirtualBox, Xvfb/Openbox | Native compilation, ZIP packaging, renderer, window tracking, host integration |
| macOS Monterey 12.7.6 Intel, VirtualBox | Native compilation, ZIP packaging, renderer, window tracking, host integration |
| Windows x64 host | x64/x86 tracker preview; x64 window lifecycle and host integration |

The lifecycle check creates a separate Electron sample game process. It verifies
that the helper follows movement and resizing, hides its visible state after
minimization, recovers after restoration, reports desktop fullscreen, keeps the HUD
eligible while its own window has focus, and exits when the game process closes.
It also opens the voice view and checks for horizontal overflow.

The launcher integration check installs the actual platform ZIP through Battly's
release loader using a local test transport. It verifies the downloaded renderer,
the launcher's local preload and shortcut registration. It invokes the registered
callback instead of simulating a physical key press.

Run `npm run test:smoke` and `npm run test:native` after building. Release CI runs
both on all six targets. Linux CI uses an X11 virtual display and Openbox; this is
not a hardware GPU or Wayland session.

The Wayland helper's companion response was checked separately. Actual Wayland
compositor integration, ARM64 execution, Minecraft sessions, microphone capture
and voice between users have not been verified in this change. No public release
or remote CI run was completed during these local checks.
