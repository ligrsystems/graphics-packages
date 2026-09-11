# LIGR graphics packages

Public downloads and issue tracking for LIGR code-based graphics, the graphics SDK, and the CLI.

Use the SDK with HTML, JavaScript, or your preferred framework.
The CLI creates projects and uploads graphics through the LIGR REST API.

Download versioned packages from [Releases](https://github.com/ligrsystems/graphics-packages/releases).
Each release includes SDK and CLI archives plus a `SHA256SUMS` file.

No GitHub or npm account is required to download these packages.
LIGR API operations require a LIGR API key.

See the [graphics documentation](https://docs.ligr.live/graphics-sdk/).

This repository hosts release downloads and public issues. Package archives are on the Releases page, not in the repository file list.
The SDK and CLI implementation source remains in a private repository.

## Issues and support

Use [GitHub Issues](https://github.com/ligrsystems/graphics-packages/issues/new/choose) for bugs, questions, concerns, and feature requests about:

- Creating and publishing code-based graphics.
- The graphics SDK and its integration with your code.
- The CLI, package downloads, and installation.
- Incorrect code graphics examples or instructions.

Include package versions, reproduction steps, and a small code example when relevant.
Issues are public. Do not include API keys, login credentials, or customer data.

Use the [LIGR Help Center](https://help.ligr.live/en/) for account, login, billing, or general application and website problems.
For example, report a broken dashboard page through the Help Center or in-app support.

## Verify a download

Download the package archives and `SHA256SUMS` from the same release.
Run this command in the download directory:

```sh
shasum -a 256 -c SHA256SUMS
```

## License

The packages use the MIT license. See [LICENSE](LICENSE).
