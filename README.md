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

## Automated issue checks

Thank you for reporting problems and suggesting improvements. Your reports help us improve LIGR, and we are sorry when problems disrupt your work.

An automated check runs when an issue opens, changes, reopens, or receives a label change.
It reads the issue form requirements and closes incomplete or explicitly out-of-scope reports with an explanation.
The response lists the unmet requirements and links to support for general application problems.
This focuses developer time on actionable code graphics, SDK, and CLI work. It is not a penalty for reporting problems.

- Bug reports require the scope confirmation, an affected area, reproduction steps, and expected and actual results.
- Features, questions, and concerns require the scope confirmation, an affected area, a topic, context, and the requested outcome.
- Empty answers and clear placeholders, such as “N/A” or “TODO”, do not satisfy required fields.
- Keep the form section headings and close code fences. Extra headings inside answers are allowed.
- Edit the existing issue to complete its requirements. The check reopens issues it previously closed once those requirements pass.
- If the check misunderstood a report, comment to request maintainer review. Maintainers can apply `triage:keep-open` and reopen it.

The check uses your declared affected area. It does not guess scope from keywords or require a specific JavaScript framework.
Unrecognized topics with complete forms remain open for maintainer review. Manually closed issues remain closed.
Issues are never deleted, and the check updates one bot comment instead of posting repeated explanations.

### Maintaining the bot

The bot uses GitHub Actions with repository Contents read and Issues write permissions. It requires no separate account or AI service.

Maintain the issue forms in `.github/ISSUE_TEMPLATE/`. They use JSON syntax, which is valid YAML, so the bot reads the same requirements.
Run the bot tests with Node.js 22:

```sh
node --check scripts/issue-triage.mjs
node --test scripts/__tests__/*.test.mjs
```

## Verify a download

Download the package archives and `SHA256SUMS` from the same release.
Run this command in the download directory:

```sh
shasum -a 256 -c SHA256SUMS
```

## License

The packages use the MIT license. See [LICENSE](LICENSE).
