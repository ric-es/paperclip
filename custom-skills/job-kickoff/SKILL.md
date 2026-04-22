---
name: job-kickoff
description: >
  Create the full job issue hierarchy when starting a new client engagement.
  Creates Job parent, Inspection, Proposal, Open Work (with payment/credentials
  gates), Summary (living document), and Closeout issues. Initializes all
  documents. Assigned to: CEO.
---

# Job Kickoff

Use this skill when the board approves a new paid engagement for an existing client.

## Prerequisites

- Client project exists in Paperclip
- Company Intake issue exists with populated `intake` document
- Board has approved starting the engagement

## Critical Rules

1. **All issues created via Paperclip API** â€” use `POST /api/companies/:companyId/issues`
2. **Job number is sequential per client** â€” check existing jobs to determine the next number
3. **Summary starts `in_progress` from day one** â€” it is a living document, not a closeout artifact
4. **All other child issues start blocked or todo** â€” they unblock as gates are cleared
5. **Post confirmation comment** on the Job parent when the hierarchy is complete

## Workflow

### Step 1 â€” Determine Job Number

1. Fetch all issues in the client project
2. Count existing Job parent issues (titles matching `Job #N`)
3. Next job number = count + 1

### Step 2 â€” Create Job Parent Issue

```
POST /api/companies/:companyId/issues
{
  "title": "Job #N",
  "projectId": "{client-project-id}",
  "status": "in_progress",
  "assigneeAgentId": "{ceo-agent-id}"
}
```

### Step 3 â€” Create 5 Child Issues

Create in this order, all with `parentId` = Job parent ID:

| # | Title | Status | Assignee | Why this status |
|---|-------|--------|----------|----------------|
| 1 | Job #N Inspection | todo | CTO | First actionable phase |
| 2 | Job #N Proposal | blocked | CEO | Blocked until inspection complete |
| 3 | Job #N Open Work | blocked | CTO | Blocked until payment + credentials |
| 4 | Job #N Summary | in_progress | CEO | Living doc from day one |
| 5 | Job #N Closeout | blocked | Concierge | Blocked until Open Work complete |

### Step 4 â€” Create Gate Issues Under Open Work

Create two child issues under Open Work:

| Title | Status |
|-------|--------|
| Payment Received | blocked |
| Credentials Received | blocked |

### Step 5 â€” Initialize Documents

**On the Proposal issue:**
- Create empty `proposal` document (key: `proposal`)
- Create empty `retainer-pitch` document (key: `retainer-pitch`)

**On the Summary issue:**
- Create `credentials` document (key: `credentials`, empty â€” populated when customer provides access)
- Create `summary` document (key: `summary`) using the template from DEV-90:
  - Fill in client name, site URL, hosting, platform from the intake document
  - Set engagement status to the current phase
  - Leave fix list empty (populated after inspection)

### Step 6 â€” Post Confirmation

Post a comment on the Job parent issue:
```
Job #N hierarchy created:
- Inspection (todo) â€” assigned to CTO
- Proposal (blocked) â€” waiting on inspection
- Open Work (blocked) â€” waiting on payment + credentials
  - Payment Received gate
  - Credentials Received gate
- Summary (in_progress) â€” living document initialized
- Closeout (blocked) â€” waiting on Open Work

Documents initialized: proposal (empty), retainer-pitch (empty), credentials (empty), summary (from template).
```

## Agent Assignments

| Agent | What they get |
|-------|---------------|
| CEO | Job parent, Proposal, Summary |
| CTO | Inspection, Open Work |
| Concierge | Closeout |

## References

- PROJECT_SOP.md Phase 4 (Job Structure)
- DEV-94 (Job Issue Creation SOP)
- DEV-90 (Job Summary Template)
