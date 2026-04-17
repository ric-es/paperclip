import { and, eq, like } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { issueLabels, labels } from "@paperclipai/db";
import { unprocessable } from "../errors.js";

const PERSISTENT_CHANNEL_LABEL_PREFIX = "persistent-";
const BLOCKER_LINE_PATTERN = /^[ \t]*BLOCKER:/im;

export interface BlockedTransitionGateInput {
  db: Db;
  previousStatus: string | null;
  nextStatus: string | undefined;
  comment: string | null | undefined;
  blockedByIssueIds?: string[];
  existingBlockedByIssueIds: string[];
  description?: string | null;
  issueId?: string | null;
}

export function commentMentionsBlockerLine(
  comment: string | null | undefined,
  description?: string | null,
): boolean {
  if (typeof comment === "string" && BLOCKER_LINE_PATTERN.test(comment)) return true;
  if (typeof description === "string" && BLOCKER_LINE_PATTERN.test(description)) return true;
  return false;
}

export async function issueHasPersistentChannelLabel(db: Db, issueId: string): Promise<boolean> {
  const row = await db
    .select({ name: labels.name })
    .from(issueLabels)
    .innerJoin(labels, eq(issueLabels.labelId, labels.id))
    .where(
      and(
        eq(issueLabels.issueId, issueId),
        like(labels.name, `${PERSISTENT_CHANNEL_LABEL_PREFIX}%`),
      ),
    )
    .limit(1);
  return row.length > 0;
}

/**
 * Reject API transitions to `blocked` that don't track the blocker.
 *
 * Allowed when any of the following hold:
 *  - effective `blockedByIssueIds` (next or existing) is non-empty
 *  - the comment body or description contains a `BLOCKER:` line
 *  - the issue carries a `persistent-*` label (bridge-class threads opt out)
 *
 * Otherwise throws an `unprocessable` (422) error so callers see a clear
 * remediation message and the response carries structured `details`.
 */
export async function assertBlockedTransitionAllowed(
  input: BlockedTransitionGateInput,
): Promise<void> {
  if (input.nextStatus !== "blocked") return;
  if (input.previousStatus === "blocked") return;

  const effectiveBlockedByIds =
    input.blockedByIssueIds === undefined
      ? input.existingBlockedByIssueIds
      : input.blockedByIssueIds;
  if (effectiveBlockedByIds.length > 0) return;

  if (commentMentionsBlockerLine(input.comment ?? null, input.description ?? null)) return;

  if (input.issueId) {
    if (await issueHasPersistentChannelLabel(input.db, input.issueId)) return;
  }

  throw unprocessable(
    "Issues moving to `blocked` must declare the blocker. " +
      "Set blockedByIssueIds to at least one issue, " +
      "or include a 'BLOCKER:' line in the comment naming the external party (board, vendor, credential).",
    { missing: "blockedByIssueIds_or_blocker_comment_line" },
  );
}
