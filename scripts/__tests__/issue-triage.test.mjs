import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { validateIssue, triageIssue, createClient } from "../issue-triage.mjs";

const scope =
  "- [x] This issue concerns code-based graphics, the graphics SDK, CLI, or code graphics examples or instructions.";
const bug = `### Issue scope\n\n${scope}\n\n### Affected area\n\nCode-based graphics\n\n### Versions and environment\n\nSDK 0.1.0, Chrome\n\n### Steps to reproduce\n\nOpen a plain HTML graphic and call show().\n\n### Expected result\n\nThe HTML is visible.\n\n### Actual result\n\nThe HTML is hidden.`;
const feature = `### Issue scope\n\n${scope}\n\n### Affected area\n\nCLI\n\n### Topic\n\nQuestion\n\n### What are you trying to do?\n\nUpload a graphic using vanilla JavaScript.\n\n### Requested outcome\n\nExplain how uploads work.`;
const actor = { id: 41898282, login: "github-actions[bot]", type: "Bot" };
function fixture(body = bug) {
  const state = {
    issue: {
      number: 7,
      body,
      title: "Graphic problem",
      state: "open",
      labels: [],
      closed_by: null,
    },
    comments: [],
    writes: [],
    reads: 0,
  };
  const client = {
    async getIssue() {
      state.reads++;
      if (state.beforeRead) state.beforeRead(state);
      return structuredClone(state.issue);
    },
    async getComments() {
      return structuredClone(state.comments);
    },
    async createComment(body) {
      if (state.failComment) throw new Error("Comment denied");
      state.writes.push("comment");
      state.comments.push({ id: 1, user: actor, body });
    },
    async updateComment(id, body) {
      if (state.failComment) throw new Error("Comment denied");
      state.writes.push("comment");
      state.comments.find((comment) => comment.id === id).body = body;
    },
    async updateIssue(update) {
      state.writes.push(update.state);
      Object.assign(state.issue, update, {
        closed_by: update.state === "closed" ? actor : null,
      });
    },
  };
  return { state, client };
}

test("plain HTML bugs and framework-agnostic questions pass", () => {
  assert.deepEqual(validateIssue(bug).failures, []);
  assert.deepEqual(validateIssue(feature).failures, []);
});

test("each required bug result rejects missing and placeholder content", () => {
  for (const value of [
    "",
    "_No response_",
    "N/A",
    "TODO",
    "...",
    "<!-- later -->",
  ]) {
    const result = validateIssue(bug.replace("The HTML is hidden.", value));
    assert.ok(
      result.failures.some((failure) => failure.includes("Actual result")),
      value,
    );
  }
});

test("missing scope and invalid or general application areas fail clearly", () => {
  assert.ok(
    validateIssue(bug.replace("- [x]", "- [ ]")).failures.some((failure) =>
      failure.includes("Issue scope"),
    ),
  );
  assert.ok(
    validateIssue(
      bug.replace("\n\nCode-based graphics\n", "\n\nUnknown\n"),
    ).failures.some((failure) => failure.includes("Affected area")),
  );
  const result = validateIssue(
    bug.replace(
      "\n\nCode-based graphics\n",
      "\n\nGeneral application, account, or website\n",
    ),
  );
  assert.equal(result.outOfScope, true);
  assert.ok(result.failures.length);
});

test("feature context and outcome are required and unknown topics request human review", () => {
  assert.ok(
    validateIssue(
      feature.replace("Explain how uploads work.", "TBD"),
    ).failures.some((failure) => failure.includes("Requested outcome")),
  );
  assert.equal(
    validateIssue(feature.replace("\n\nQuestion\n", "\n\nSomething unusual\n"))
      .review,
    true,
  );
});

test("duplicate form headings and mixed forms fail without accepting forged sections", () => {
  assert.ok(
    validateIssue(
      `${bug}\n\n### Actual result\n\nAnother result`,
    ).failures.some((failure) => failure.includes("duplicate")),
  );
  assert.ok(validateIssue(`${bug}\n\n### Topic\n\nQuestion`).failures.length);
});

test("fenced headings are code, including longer fences and tildes", () => {
  for (const fence of ["```", "````", "~~~"]) {
    const body = bug.replace(
      "Open a plain HTML graphic and call show().",
      `${fence}html\n### Actual result\n<input value="test">\n${fence}`,
    );
    assert.deepEqual(validateIssue(body).failures, []);
  }
});

test("ordinary prose requires a form without keyword classification", () => {
  assert.ok(
    validateIssue("Please fix my SDK").failures.some((failure) =>
      failure.includes("form"),
    ),
  );
  assert.deepEqual(
    validateIssue(
      bug.replace("The HTML is hidden.", "My billing page is broken."),
    ).failures,
    [],
  );
});

test("extra markdown headings remain part of answers and absence is a valid observed result", () => {
  const body = bug.replace(
    "Open a plain HTML graphic and call show().",
    "Open the graphic.\n\n### Browser details\n\nChrome on macOS.",
  );
  assert.deepEqual(validateIssue(body).failures, []);
  for (const result of ["None", "No response", "No output"]) {
    assert.deepEqual(
      validateIssue(bug.replace("The HTML is hidden.", result)).failures,
      [],
    );
  }
  assert.ok(
    validateIssue(
      bug.replace("### Actual result", "### What happened"),
    ).failures.some((failure) => failure.includes("Actual result")),
  );
});

test("invalid issue receives an appreciative explanation before closing", async () => {
  const { state, client } = fixture(bug.replace("The HTML is hidden.", "N/A"));
  await triageIssue(client);
  assert.deepEqual(state.writes, ["comment", "closed"]);
  assert.match(state.comments[0].body, /Actual result/);
  assert.match(state.comments[0].body, /Thank you/);
  assert.match(state.comments[0].body, /sorry/);
  assert.match(state.comments[0].body, /developer time/);
  assert.match(state.comments[0].body, /not a penalty/);
  assert.equal(state.issue.state_reason, "not_planned");
});

test("out-of-scope closure directs the reporter to support", async () => {
  const { state, client } = fixture(
    bug.replace(
      "\n\nCode-based graphics\n",
      "\n\nGeneral application, account, or website\n",
    ),
  );
  await triageIssue(client);
  assert.match(state.comments[0].body, /https:\/\/help.ligr.live\/en\//);
});

test("correcting a bot-closed issue reuses its comment and reopens it", async () => {
  const { state, client } = fixture(bug.replace("The HTML is hidden.", "N/A"));
  await triageIssue(client);
  state.issue.body = bug;
  await triageIssue(client);
  assert.equal(state.issue.state, "open");
  assert.equal(state.comments.length, 1);
  assert.match(state.comments[0].body, /requirements are now complete/);
  assert.deepEqual(state.writes, ["comment", "closed", "comment", "open"]);
});

test("manual closures, pull requests, and keep-open overrides are untouched", async () => {
  for (const update of [
    { state: "closed", closed_by: { login: "maintainer", id: 5 } },
    { pull_request: {} },
    { labels: [{ name: "triage:keep-open" }] },
  ]) {
    const { state, client } = fixture("incomplete");
    Object.assign(state.issue, update);
    await triageIssue(client);
    assert.deepEqual(state.writes, []);
  }
});

test("repeated events do not post duplicate comments or reclose issues", async () => {
  const { state, client } = fixture("incomplete");
  await triageIssue(client);
  await triageIssue(client);
  assert.equal(state.comments.length, 1);
  assert.deepEqual(state.writes, ["comment", "closed"]);
});

test("a user cannot forge a bot comment and issue content is never echoed", async () => {
  const { state, client } = fixture(
    "$(touch /tmp/pwned) `${{ secrets.GITHUB_TOKEN }}`",
  );
  state.comments.push({
    id: 90,
    user: { id: 5, login: "attacker", type: "User" },
    body: "<!-- ligr-issue-triage:v1 -->",
  });
  await triageIssue(client);
  assert.equal(state.comments.length, 2);
  assert.doesNotMatch(state.comments[1].body, /touch|secrets|pwned/);
});

test("posting failure prevents closure", async () => {
  const { state, client } = fixture("incomplete");
  state.failComment = true;
  await assert.rejects(triageIssue(client), /Comment denied/);
  assert.equal(state.issue.state, "open");
});

test("stale checks stop before comments or state changes", async () => {
  for (const changeAt of [2, 3]) {
    const { state, client } = fixture("incomplete");
    state.beforeRead = (current) => {
      if (current.reads === changeAt) current.issue.body = bug;
    };
    await triageIssue(client);
    assert.equal(state.issue.state, "open");
    assert.ok(!state.writes.includes("closed"));
  }
});

test("unknown complete topics stay open with one human-review comment", async () => {
  const { state, client } = fixture(
    feature.replace("\n\nQuestion\n", "\n\nOther discussion\n"),
  );
  await triageIssue(client);
  assert.equal(state.issue.state, "open");
  assert.match(state.comments[0].body, /maintainer review/);
});

test("API client paginates comments and fails without exposing response bodies", async () => {
  const calls = [];
  const client = createClient({
    repository: "ligrsystems/graphics-packages",
    number: 7,
    token: "secret",
    fetcher: async (url, init) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify(
          new URL(url).searchParams.get("page") === "1"
            ? Array.from({ length: 100 }, (_, id) => ({ id }))
            : [{ id: 101 }],
        ),
        { status: 200 },
      );
    },
  });
  assert.equal((await client.getComments()).length, 101);
  assert.equal(calls.length, 2);
  const failing = createClient({
    repository: "ligrsystems/graphics-packages",
    number: 7,
    token: "secret",
    fetcher: async () => new Response("SECRET RESPONSE", { status: 403 }),
  });
  await assert.rejects(
    failing.getIssue(),
    (error) => /403/.test(error.message) && !/SECRET/.test(error.message),
  );
});

test("GitHub form submissions satisfy the same policy and every required answer is enforced", () => {
  for (const name of ["bug", "feature-or-question"]) {
    const form = JSON.parse(
      readFileSync(
        new URL(`../../.github/ISSUE_TEMPLATE/${name}.yml`, import.meta.url),
        "utf8",
      ),
    );
    const fields = form.body.filter((field) => field.id);
    const answers = fields.map((field) => ({
      field,
      text:
        field.type === "checkboxes"
          ? field.attributes.options
              .map((option) => `- [x] ${option.label}`)
              .join("\n")
          : field.type === "dropdown"
            ? field.attributes.options[0]
            : "A concrete description of the observed workflow.",
    }));
    const submission = (values) =>
      values
        .map(({ field, text }) => `### ${field.attributes.label}\n\n${text}`)
        .join("\n\n");
    assert.deepEqual(validateIssue(submission(answers)).failures, []);
    for (const answer of answers.filter(
      ({ field }) => field.validations?.required || field.type === "checkboxes",
    )) {
      const incomplete = answers.map((value) =>
        value === answer ? { ...value, text: "_No response_" } : value,
      );
      assert.ok(
        validateIssue(submission(incomplete)).failures.some((failure) =>
          failure.includes(answer.field.attributes.label),
        ),
        `${name}: ${answer.field.id}`,
      );
    }
  }
});

test("manually closing a formerly bot-closed report prevents automatic reopening", async () => {
  const { state, client } = fixture("incomplete");
  await triageIssue(client);
  state.issue.closed_by = { id: 5, login: "maintainer", type: "User" };
  state.issue.body = bug;
  const count = state.writes.length;
  await triageIssue(client);
  assert.equal(state.writes.length, count);
  assert.equal(state.issue.state, "closed");
});

test("comment edit failure prevents reopening a corrected report", async () => {
  const { state, client } = fixture("incomplete");
  await triageIssue(client);
  state.issue.body = bug;
  state.failComment = true;
  await assert.rejects(triageIssue(client), /Comment denied/);
  assert.equal(state.issue.state, "closed");
});

test("a failed state update is retried without creating a second comment", async () => {
  const { state, client } = fixture("incomplete");
  const update = client.updateIssue;
  client.updateIssue = async () => {
    throw new Error("Rate limited");
  };
  await assert.rejects(triageIssue(client), /Rate limited/);
  assert.equal(state.issue.state, "open");
  client.updateIssue = update;
  await triageIssue(client);
  assert.equal(state.comments.length, 1);
  assert.equal(state.issue.state, "closed");
});

test("API mutations use fixed GitHub URLs and JSON request bodies", async () => {
  const requests = [];
  const client = createClient({
    repository: "ligrsystems/graphics-packages",
    number: 7,
    token: "secret",
    fetcher: async (url, init) => {
      requests.push({ url, init });
      return new Response("{}", { status: 200 });
    },
  });
  await client.createComment("$(touch /tmp/example)");
  await client.updateComment(12, "Updated");
  await client.updateIssue({ state: "closed", state_reason: "not_planned" });
  assert.deepEqual(
    requests.map((request) => [request.url, request.init.method]),
    [
      [
        "https://api.github.com/repos/ligrsystems/graphics-packages/issues/7/comments",
        "POST",
      ],
      [
        "https://api.github.com/repos/ligrsystems/graphics-packages/issues/comments/12",
        "PATCH",
      ],
      [
        "https://api.github.com/repos/ligrsystems/graphics-packages/issues/7",
        "PATCH",
      ],
    ],
  );
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    body: "$(touch /tmp/example)",
  });
  assert.ok(requests.every((request) => request.init.redirect === "error"));
  assert.throws(() =>
    createClient({ repository: "other/repo", number: 7, token: "secret" }),
  );
  assert.throws(() =>
    createClient({
      repository: "ligrsystems/graphics-packages",
      number: "../7",
      token: "secret",
    }),
  );
});
