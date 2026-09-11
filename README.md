# LIGR graphics packages

Public downloads for the LIGR graphics SDK and CLI.

Use the SDK with HTML, JavaScript, or your preferred framework.
The CLI creates projects and uploads graphics through the LIGR REST API.

Download versioned packages from [Releases](https://github.com/ligrsystems/graphics-packages/releases).
Each release includes SDK and CLI archives plus a `SHA256SUMS` file.

No GitHub or npm account is required to download these packages.
LIGR API operations require a LIGR API key.

See the [graphics documentation](https://docs.ligr.live/graphics-sdk/).

This repository contains distribution files. The LIGR application source remains in a separate repository.

## Verify a download

Download the package archives and `SHA256SUMS` from the same release.
Run this command in the download directory:

```sh
shasum -a 256 -c SHA256SUMS
```

## License

The packages use the MIT license. See [LICENSE](LICENSE).
