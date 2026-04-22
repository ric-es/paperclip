---
name: update-summary
description: >
  Update the living Job Summary document after completing work on a fix,
  discovering out-of-scope items, or reaching a milestone. Any agent working
  on a job should use this skill after completing their task.
  Assigned to: all agents working on client jobs.
---

# Update Summary

Use this skill after completing any work on a client engagement â€” a fix, an inspection finding, a milestone, or an out-of-scope discovery.

## Prerequisites

- You have just completed work on an issue that is part of a client job
- The Job Summary issue exists with a `summary` document

## Critical Rules

1. **Never overwrite existing content** â€” append to the relevant section
2. **Use the Paperclip document API** â€” `PUT /api/issues/:issueId/documents/summary`
3. **Fetch the current document first** â€” read before writing to avoid losing other agents' updates
4. **Timestamp your entries** â€” use ISO date format (YYYY-MM-DD)
5. **Be factual and specific** â€” no filler language, state what was done and what was found

## Workflow

### Step 1 â€” Find the Job Summary Issue

1. From your current issue, walk up the parent chain to find the Job parent
2. Find the child issue titled `Job #N Summary`
3. Fetch its `summary` document: `GET /api/issues/:summaryIssueId/documents`

### Step 2 â€” Determine What to Update

| What happened | Section to update |
|---------------|-------------------|
| Fix completed | "Original Scope" table (status column) + "Work In Progress" (add notes) |
| Out-of-scope item found | "Out-of-Scope Findings" (add item with description) |
| Out-of-scope item fixed | "Out-of-Scope Findings" (update status) |
| Milestone reached | "Engagement History" (add dated entry) |
| Credentials received | `credentials` document (add access details) |
| New remaining item found | "Remaining Items" (add with description) |

### Step 3 â€” Update the Document

1. Read the current `summary` document body
2. Parse the relevant markdown section
3. Append your update to the correct section
4. PUT the updated document back

```
PUT /api/issues/:summaryIssueId/documents/summary
{
  "format": "markdown",
  "body": "<full updated document body>"
}
```

### Step 4 â€” Post a Brief Comment

Post a comment on the Summary issue noting what was updated:
```
Updated summary: [section] â€” [brief description of what changed]
```

## Examples

**After completing Fix #3:**
- Update Original Scope table: Fix #3 status from `in_progress` to `done`
- Add to Work In Progress: "2026-04-15 â€” Fix #3: Replaced broken email template. Root cause was outdated WooCommerce hook. Tested on staging, confirmed order notifications arriving."
- Add to Engagement History: "2026-04-15 â€” Fix #3 completed and deployed to production"

**After discovering an out-of-scope item:**
- Add to Out-of-Scope Findings: "WordPress URL config â€” Site running HTTP internally, relying on SiteGround redirect to HTTPS. Low risk but worth fixing in a separate engagement."
- Add to Remaining Items if not fixed in this engagement

## References

- PROJECT_SOP.md Phase 6 (Job Summary)
- DEV-90 (Job Summary Template)
