import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// JSON is valid YAML. Read the actual GitHub forms so their requirements cannot drift.
const forms = ["bug", "feature-or-question"].map((name) =>
  JSON.parse(
    readFileSync(
      new URL(`../.github/ISSUE_TEMPLATE/${name}.yml`, import.meta.url),
      "utf8",
    ),
  ),
);
const marker = "<!-- ligr-issue-triage:v1 -->";
const botId = 41898282;
const generalArea = "General application, account, or website";
const keepOpen = "triage:keep-open";
const formHeadings = new Set(
  forms.flatMap((form) =>
    form.body
      .filter((field) => field.id)
      .map((field) => field.attributes.label),
  ),
);

function parseSections(body) {
  const sections = new Map();
  const duplicates = [];
  let current;
  let fence;
  for (const line of body.split(/\r?\n/)) {
    const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (
        delimiter &&
        delimiter[1][0] === fence[0] &&
        delimiter[1].length >= fence.length &&
        !delimiter[2].trim()
      )
        fence = undefined;
      if (current) sections.get(current).push(line);
      continue;
    }
    if (delimiter) {
      fence = delimiter[1];
      if (current) sections.get(current).push(line);
      continue;
    }
    const heading = line.match(/^### (.+?)\s*#*\s*$/);
    if (heading && formHeadings.has(heading[1])) {
      current = heading[1];
      if (sections.has(current)) duplicates.push(current);
      else sections.set(current, []);
    } else if (current) sections.get(current).push(line);
  }
  return {
    sections: new Map(
      [...sections].map(([key, lines]) => [key, lines.join("\n").trim()]),
    ),
    duplicates,
    unclosedFence: Boolean(fence),
  };
}

function hasContent(value = "") {
  const withoutComments = value.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (withoutComments === "_No response_") return false;
  const plain = withoutComments.replace(/^[_*]+|[_*]+$/g, "").trim();
  return (
    Boolean(plain) &&
    !/^(?:n\/?a|todo|tbd|not applicable|\.{1,}|-+)$/i.test(plain)
  );
}

export function validateIssue(body = "") {
  const { sections, duplicates, unclosedFence } = parseSections(body ?? "");
  const failures = [];
  let review = false;
  const bugFields = ["Steps to reproduce", "Expected result", "Actual result"];
  const featureFields = [
    "Topic",
    "What are you trying to do?",
    "Requested outcome",
  ];
  const isBug = bugFields.some((label) => sections.has(label));
  const isFeature = featureFields.some((label) => sections.has(label));
  if (!isBug && !isFeature)
    failures.push(
      "Use a bug or feature/question issue form and keep its section headings.",
    );
  if (isBug && isFeature)
    failures.push(
      "Use one issue form; do not combine bug and feature/question sections.",
    );
  if (duplicates.length)
    failures.push(
      "Remove duplicate form section headings; each section must appear once.",
    );
  if (unclosedFence)
    failures.push("Close code fences so the form sections remain readable.");
  const form = forms[isFeature && !isBug ? 1 : 0];
  for (const field of form.body) {
    if (!field.id) continue;
    const { label, options = [] } = field.attributes;
    const value = sections.get(label) ?? "";
    if (field.type === "checkboxes") {
      for (const option of options.filter((option) => option.required)) {
        if (
          !value
            .split("\n")
            .some(
              (line) =>
                line.trim() === `- [x] ${option.label}` ||
                line.trim() === `- [X] ${option.label}`,
            )
        ) {
          failures.push(
            `Confirm “${label}” for a code graphics, SDK, or CLI issue.`,
          );
        }
      }
    } else if (field.validations?.required && !hasContent(value)) {
      failures.push(
        `Complete “${label}” with useful details, not an empty answer or placeholder.`,
      );
    } else if (
      field.type === "dropdown" &&
      hasContent(value) &&
      !options.includes(value)
    ) {
      if (field.id === "topic") review = true;
      else failures.push(`Select a supported option in “${label}”.`);
    }
  }
  const outOfScope = sections.get("Affected area") === generalArea;
  if (outOfScope)
    failures.push(
      "This repository accepts code graphics, SDK, CLI, package, and code graphics documentation issues. General application, account, and website problems use support.",
    );
  return { failures, outOfScope, review };
}

function isBot(user) {
  return user?.id === botId && user?.type === "Bot";
}
function snapshot(issue) {
  return JSON.stringify([
    issue.body,
    issue.title,
    issue.state,
    issue.closed_by?.id,
    issue.labels.map((label) => label.name).sort(),
  ]);
}

function response(result) {
  const greeting =
    "Thank you for taking the time to report this. Your reports help improve LIGR, and we are sorry for the problem you encountered.";
  if (result.failures.length) {
    return `${marker}\n\n${greeting}\n\nThis automated check found these unmet issue requirements:\n\n${result.failures.map((failure) => `- ${failure}`).join("\n")}\n\nThe check closes this issue to focus developer time on actionable code graphics, SDK, and CLI work. This is not a penalty for reporting a problem.\n\nEdit this issue using the [issue form requirements](https://github.com/ligrsystems/graphics-packages/issues/new/choose). When the requirements are complete, the check will reopen it automatically.\n\nFor account, login, billing, or general application and website problems, use the [LIGR Help Center](https://help.ligr.live/en/).\n\nIf this check misunderstood your report, leave a comment requesting maintainer review. A maintainer can apply \`${keepOpen}\` and reopen it.`;
  }
  return `${marker}\n\n${greeting}\n\nThe issue form requirements are now complete.${result.review ? " The topic needs maintainer review; no automatic topic rejection applies." : ""} A previously closed automated report will reopen.\n\nThese checks focus developer time on actionable reports. They do not assess the value of your feedback.`;
}

export async function triageIssue(client) {
  const issue = await client.getIssue();
  if (
    issue.pull_request ||
    issue.labels.some((label) => label.name === keepOpen)
  )
    return "ignored";
  const comments = await client.getComments();
  const own = comments.find(
    (comment) => isBot(comment.user) && comment.body.startsWith(marker),
  );
  const botClosed =
    issue.state === "closed" && isBot(issue.closed_by) && Boolean(own);
  if (issue.state === "closed" && !botClosed) return "manual-close";
  const result = validateIssue(issue.body);
  if (!result.failures.length && !own && !result.review) return "valid";
  const unchanged = async () =>
    snapshot(await client.getIssue()) === snapshot(issue);
  if (!(await unchanged())) return "stale";
  const commentBody = response(result);
  if (own) {
    if (own.body !== commentBody)
      await client.updateComment(own.id, commentBody);
  } else await client.createComment(commentBody);
  if (!(await unchanged())) return "stale";
  if (result.failures.length && issue.state === "open")
    await client.updateIssue({ state: "closed", state_reason: "not_planned" });
  if (!result.failures.length && botClosed)
    await client.updateIssue({ state: "open", state_reason: "reopened" });
  return result.failures.length ? "requirements-failed" : "valid";
}

export function createClient({ repository, number, token, fetcher = fetch }) {
  if (
    repository !== "ligrsystems/graphics-packages" ||
    !Number.isSafeInteger(number) ||
    number < 1 ||
    !token
  )
    throw new Error("Invalid issue triage configuration.");
  const root = `https://api.github.com/repos/${repository}`;
  async function request(path, method = "GET", body) {
    const result = await fetcher(`${root}${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!result.ok)
      throw new Error(`GitHub issue triage request failed (${result.status}).`);
    return result.status === 204 ? undefined : result.json();
  }
  return {
    getIssue: () => request(`/issues/${number}`),
    async getComments() {
      const comments = [];
      for (let page = 1; ; page++) {
        const batch = await request(
          `/issues/${number}/comments?per_page=100&page=${page}`,
        );
        comments.push(...batch);
        if (batch.length < 100) return comments;
      }
    },
    createComment: (body) =>
      request(`/issues/${number}/comments`, "POST", { body }),
    updateComment: (id, body) =>
      request(`/issues/comments/${id}`, "PATCH", { body }),
    updateIssue: (body) => request(`/issues/${number}`, "PATCH", body),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const event = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
    );
    if (
      !["opened", "edited", "reopened", "labeled", "unlabeled"].includes(
        event.action,
      )
    )
      throw new Error("Unsupported issue event.");
    const result = await triageIssue(
      createClient({
        repository: process.env.GITHUB_REPOSITORY,
        number: event.issue?.number,
        token: process.env.GITHUB_TOKEN,
      }),
    );
    console.log(`Issue triage: ${result}`);
  } catch {
    console.error(
      "Issue triage failed. No further changes were attempted. Check workflow permissions and GitHub availability.",
    );
    process.exitCode = 1;
  }
}
