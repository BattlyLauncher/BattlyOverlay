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

Additional checks used the launcher production adapter and voice controller:

- Linux ran Minecraft 1.20.1 in demo mode with Java 17. Ctrl+B opened the release
  overlay through system keyboard events in windowed and fullscreen modes. A demo
  world loaded, opening LAN displayed the automatic invitation, and saving the
  world and choosing Quit Game ended the JVM with exit code 0 and closed the HUD.
- macOS processed a real Command+B keyboard event and opened the downloaded UI.
  Shortcut labels now show Command on macOS. Minecraft 1.20.1 and 1.16.5 both failed
  before creating their window with `GLFW 65545: NSGL: Failed to find a suitable
  pixel format`. This VM cannot prove Minecraft/overlay compatibility on a Mac
  with a supported GPU.
- Electron ran with the native Wayland backend under a real headless Weston
  compositor. The release UI opened as a companion panel through the host action.
  This does not prove a physical global shortcut or overlay stacking in GNOME,
  KDE, or an exclusive fullscreen Wayland game.
- Two renderer clients exercised the production voice controller and real WebRTC
  audio. Linux captured an OS PulseAudio virtual input through getUserMedia;
  macOS used generated WebAudio tracks because the VM exposes no input device.
  Receiving audio energy, mute, deafen, volume, and disconnect passed on both;
  Linux also passed changing the input device and reconnecting the peer.

The voice check uses local signaling and test identities. Calls between real
Battly accounts through the API, physical microphones/headsets, Apple Silicon,
Linux ARM64, and native Windows x86 remain unverified. No public release or remote
CI run was completed during these local checks.
