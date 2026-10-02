# Release contract

Protocol: `1`. Version: semantic `MAJOR.MINOR.PATCH`, read from `VERSION`.

Assets are named `battly-overlay-<platform>-<arch>.zip`. Platform names are
`win32`, `linux`, `darwin`; architectures are `ia32`, `x64`, `arm64` as listed in
the workflow. Every archive contains `renderer/`, `WindowTracker[.exe]` and notices.

`manifest.json` specifies the release version, protocol and one entry per target.
Each entry records the archive name, length, SHA-256 and a complete file inventory
with lengths, hashes and executable flags. The host must reject missing/duplicate
targets, unexpected files, traversal paths, links, oversized packages and a
different protocol/version. Download to staging and publish only after verification.

Hashes identify bytes; they are not a publisher signature. Release transport trusts
GitHub HTTPS and repository publishing authority. The workflow also produces GitHub
attestations, which maintainers can verify separately with `gh attestation verify`.
The Battly downloader currently checks the manifest and hashes, not attestations.

To adopt a release in Battly, update its pinned overlay version after reviewing
the source and testing the package. The authenticated bridge remains local to Battly.
To roll back, ship the previous reviewed pin in the launcher. Do not replace assets
under an existing tag or make a moving `latest` endpoint authoritative for code.

An interrupted publication can leave a draft. Inspect it before removing/retrying;
the workflow refuses to overwrite it. No public release appears until all assets
have been uploaded. Native executables are not Authenticode-signed or notarized by
this workflow; those require the publisher's signing configuration.
