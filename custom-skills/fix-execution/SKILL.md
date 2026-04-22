---
name: fix-execution
description: >
  Execute a single fix using the staging-first workflow. Enforces backup,
  staging deployment, verification, QA screenshots, board approval, and
  production deployment. One fix at a time, one review at a time.
  Assigned to: CTO / Engineers.
---

# Fix Execution

Use this skill for every fix subtask under Open Work. Each fix follows the same staging-first workflow.

## Prerequisites

- Both gates (Payment Received, Credentials Received) are closed
- Fix subtask exists with a title like `Fix #N: [description]`
- Credentials are available in the Job Summary `credentials` document

## Critical Rules

1. **NEVER touch production without explicit board approval** â€” no exceptions
2. **Staging first** â€” all changes applied on staging before production
3. **One fix, one review, one deploy** â€” never batch multiple fixes
4. **Plan document required** â€” Before/Fix/After/Rollback format
5. **QA evidence required** â€” before/after screenshots, live site verification
6. **Rollback SLA: 30 minutes** â€” if production breaks, roll back immediately
7. **Scope fence** â€” do not fix anything not in the approved proposal

## Workflow

### Step 1 â€” Create Plan Document

Attach a `plan` document to the fix issue:

```
## Before
[Describe the current broken state in specific, observable terms]

## Fix  
[Exact steps to apply on staging. Be precise: plugin setting, file path, WP-CLI command]

## After
[How to verify the fix worked. Observable outcome.]

## Rollback
[Exact steps to undo. Must be completable in under 5 minutes.]
```

Set fix issue status to `in_review` for board pre-approval of the plan.

### Step 2 â€” Backup

Before any changes:
1. Create hosting-level snapshot (SiteGround â†’ Backups â†’ Create Backup)
   - Label: `YYYY-MM-DD-pre-{issue-identifier}`
2. Download local backup (files + database dump)
3. Confirm both backups exist before proceeding

### Step 3 â€” Apply Fix on Staging

1. Apply the fix exactly as described in the plan document
2. Only on staging â€” never on production
3. If the fix requires multiple steps, apply them as a single logical unit

### Step 4 â€” Verify on Staging

Run the Post-Change Verification Checklist:
- [ ] Homepage loads without errors
- [ ] Admin dashboard accessible (/wp-admin)
- [ ] WooCommerce Orders page loads
- [ ] Add test product to cart
- [ ] Checkout form renders correctly
- [ ] (Staging) Complete test order end-to-end
- [ ] No PHP warnings/errors in console or debug log
- [ ] The specific fix works as expected

Capture before and after screenshots.

### Step 5 â€” QA Check

Verify from a customer perspective:
- Load affected pages in a clean browser session
- Check that the fix does not break adjacent functionality
- Ideally performed by a different agent than the one who implemented the fix

All QA evidence posted to the fix issue as comments.

### Step 6 â€” Request Board Approval for Production

1. Set fix issue status to `in_review`
2. Post a comment with:
   - What was fixed (plain language)
   - Staging URL where it can be verified
   - Before/after screenshots
   - Verification checklist results
   - Explicit request: "Requesting board approval to deploy to production"

### Step 7 â€” Deploy to Production

**Only after explicit board approval:**

1. Apply the same fix to production
2. Run the verification checklist on production
3. Confirm the fix works on the live site
4. Post confirmation comment with production evidence

### Step 8 â€” Update Summary and Close

1. Use the `update-summary` skill to update the Job Summary
2. Mark the fix issue as `done`
3. If this was the last fix, create the final review subtask

## Scope Fence Hard Stops

These require a SEPARATE board approval (not just plan approval):
- Drop or truncate any database table
- Delete user accounts or customer records
- Mass-edit products, prices, or inventory (>5 records)
- Change domain name, DNS, or nameservers
- Modify SSL certificate configuration
- Deactivate WooCommerce or any payment gateway
- Export or download customer PII
- Grant external third-party access

If you encounter any of these: STOP. Post a blocked comment. Wait for board.

## Escalation

If anything unexpected happens: STOP. Do not improvise. Post a blocked comment explaining what happened and what you need.

## References

- PROJECT_SOP.md Phase 5 (Open Work)
- SAFETY_PROTOCOL.md (full safety procedures)
- CLIENT_WORKFLOW.md (review workflow)
