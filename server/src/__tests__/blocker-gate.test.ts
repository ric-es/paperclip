import { describe, expect, it } from "vitest";
import { assertBlockedTransitionAllowed } from "../services/blocker-gate.js";
import { HttpError } from "../errors.js";

type DbChainResult = ReadonlyArray<{ name: string }>;

function makeDbWithPersistentLabels(result: DbChainResult) {
  const limit = () => Promise.resolve(result);
  const where = () => ({ limit });
  const innerJoin = () => ({ where });
  const from = () => ({ innerJoin });
  const select = () => ({ from });
  return { select } as unknown as Parameters<typeof assertBlockedTransitionAllowed>[0]["db"];
}

const emptyDb = makeDbWithPersistentLabels([]);

describe("assertBlockedTransitionAllowed (NODA-163)", () => {
  it("is a no-op when nextStatus is not blocked", async () => {
    await expect(
      assertBlockedTransitionAllowed({
        db: emptyDb,
        previousStatus: "todo",
        nextStatus: "in_progress",
        comment: null,
        existingBlockedByIssueIds: [],
      }),
    ).resolves.toBeUndefined();
  });

  it("is a no-op when the issue is already blocked (re-block edge without schema churn)", async () => {
    await expect(
      assertBlockedTransitionAllowed({
        db: emptyDb,
        previousStatus: "blocked",
        nextStatus: "blocked",
        comment: null,
        existingBlockedByIssueIds: [],
      }),
    ).resolves.toBeUndefined();
  });

  it("allows the transition when the request provides a non-empty blockedByIssueIds", async () => {
    await expect(
      assertBlockedTransitionAllowed({
        db: emptyDb,
        previousStatus: "in_progress",
        nextStatus: "blocked",
        comment: null,
        blockedByIssueIds: ["00000000-0000-0000-0000-000000000001"],
        existingBlockedByIssueIds: [],
      }),
    ).resolves.toBeUndefined();
  });

  it("allows the transition when the request omits blockedByIssueIds but existing blockers are tracked", async () => {
    await expect(
      assertBlockedTransitionAllowed({
        db: emptyDb,
        previousStatus: "in_progress",
        nextStatus: "blocked",
        comment: null,
        existingBlockedByIssueIds: ["00000000-0000-0000-0000-000000000099"],
      }),
    ).resolves.toBeUndefined();
  });

  it("allows the transition when the comment carries a BLOCKER: line", async () => {
    await expect(
      assertBlockedTransitionAllowed({
        db: emptyDb,
        previousStatus: "in_progress",
        nextStatus: "blocked",
        comment: "Status update\n\nBLOCKER: waiting on vendor creds",
        existingBlockedByIssueIds: [],
      }),
    ).resolves.toBeUndefined();
  });

  it("allows the transition for persistent-* channel issues even without blockers or BLOCKER: line", async () => {
    const persistentDb = makeDbWithPersistentLabels([{ name: "persistent-channel" }]);
    await expect(
      assertBlockedTransitionAllowed({
        db: persistentDb,
        previousStatus: "in_progress",
        nextStatus: "blocked",
        comment: "no blocker declared",
        existingBlockedByIssueIds: [],
        issueId: "issue-persistent-1",
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects the transition with 422 when no blockers, no BLOCKER: line, and no persistent label", async () => {
    let thrown: unknown;
    try {
      await assertBlockedTransitionAllowed({
        db: emptyDb,
        previousStatus: "in_progress",
        nextStatus: "blocked",
        comment: "waiting on something vague",
        existingBlockedByIssueIds: [],
        issueId: "issue-ordinary-1",
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(HttpError);
    expect((thrown as HttpError).status).toBe(422);
    expect((thrown as HttpError).message).toMatch(/declare the blocker/);
    expect((thrown as HttpError).details).toEqual({
      code: "blocker_required",
      missing: "blockedByIssueIds_or_blocker_comment_line",
    });
  });

  it("rejects the transition when blockedByIssueIds is explicitly empty even if existing blockers were present", async () => {
    let thrown: unknown;
    try {
      await assertBlockedTransitionAllowed({
        db: emptyDb,
        previousStatus: "in_progress",
        nextStatus: "blocked",
        comment: null,
        blockedByIssueIds: [],
        existingBlockedByIssueIds: ["00000000-0000-0000-0000-000000000099"],
        issueId: "issue-ordinary-2",
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(HttpError);
    expect((thrown as HttpError).status).toBe(422);
  });

  it("rejects when there is no issueId and no other escape (new-issue creation path)", async () => {
    let thrown: unknown;
    try {
      await assertBlockedTransitionAllowed({
        db: emptyDb,
        previousStatus: null,
        nextStatus: "blocked",
        comment: "waiting on X",
        existingBlockedByIssueIds: [],
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(HttpError);
    expect((thrown as HttpError).status).toBe(422);
  });
});
