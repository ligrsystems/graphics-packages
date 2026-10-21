# LIGR graphics packages

Public downloads and issue tracking for LIGR code-based graphics, the graphics SDK, and the CLI.

Use the SDK with HTML, JavaScript, or your preferred framework.
The CLI creates projects and uploads graphics through the LIGR REST API.

Install the CLI from npm. It gives you the `ligr` command:

```sh
npm i -g @ligr/cli
ligr graphic --help
```

To run it once without an install, use `npx @ligr/cli graphic <command>`.
`ligr-graphic` is the old name. `npx ligr-graphic <command>` still runs `ligr graphic <command>` and prints a deprecation notice.
Replace `ligr-graphic <command>` with `ligr graphic <command>`.

Download versioned SDK and CLI archives from [Releases](https://github.com/ligrsystems/graphics-packages/releases).
Each release includes the SDK and CLI archives plus a `SHA256SUMS` file.
From 0.6.0, the CLI archive is `ligr-cli-<version>.tgz`.

No GitHub or npm account is required to install these packages.
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

## Publish to npm

The `Publish @ligr/cli to npm` workflow publishes the CLI archive of each published release to npm.
It runs in this public repository, so npm can link each version to this repository (provenance).
npm makes no provenance for a package published from a private repository.

The workflow uses npm trusted publishing. GitHub gives the job an OIDC token, and npm trades it for a one-time publish token.
No npm token is stored in this repository.

Before the workflow publishes, it:

- Downloads `ligr-cli-<version>.tgz` and `SHA256SUMS` from the release.
- Checks the archive against its `SHA256SUMS` line.
- Checks that the archive holds `@ligr/cli` at the release version.
- Stops with success if npm already has that version.

A prerelease version gets the `next` dist-tag. Other versions get `latest`.

The job runs in the GitHub environment `npm`. The npm trusted publisher names that environment.
Only `main` and `v*` tags can deploy to it, so a changed copy of the workflow on another branch cannot publish.

The workflow is off until the repository variable `NPM_PUBLISH` is `true`. To turn it on:

1. Publish the first version of `@ligr/cli` by hand. npm adds a trusted publisher only to a package that exists.
2. In this repository, open Settings > Environments and create `npm`. Under Deployment branches and tags, select "Selected branches and tags". Add the branch `main` and the tag pattern `v*`.
3. On npmjs.com, open `@ligr/cli` > Settings > Trusted publishing. Select GitHub Actions.
4. Set the organization to `ligrsystems`, the repository to `graphics-packages`, the workflow to `publish-npm.yml` and the environment to `npm`.
5. Allow the `npm publish` action.
6. Set the repository variable `NPM_PUBLISH` to `true`.

To publish an earlier release again, run the workflow by hand with its tag, for example `v0.6.0`.

## Verify a download

Download the package archives and `SHA256SUMS` from the same release.
Run this command in the download directory:

```sh
shasum -a 256 -c SHA256SUMS
```

## License

The packages use the MIT license. See [LICENSE](LICENSE).
