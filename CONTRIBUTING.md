# Contributing

Keep changes focused and explain the user-visible behavior in the pull request.
Run the checks in the README. Native changes need a test on the affected desktop,
including focus changes, minimizing, fullscreen, game exit and display scaling.

Do not add service URLs, authentication code, telemetry or secrets. Extend the host
contract when the interface needs new data. Keep the bundled language keys aligned.
Use existing Battly assets; do not redraw the logo.

For a release, update both VERSION and package.json, document the change in
CHANGELOG.md, and prepare RELEASE-NOTES.md. Describe platform limitations honestly.
