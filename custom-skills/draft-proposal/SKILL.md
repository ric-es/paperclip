---
name: draft-proposal
description: >
  Draft a customer-facing proposal and retainer pitch from inspection findings.
  Creates the proposal and retainer-pitch documents on the Proposal issue.
  Pricing uses current tier structure. Payment is collected upfront before
  work begins. Assigned to: CEO.
---

# Draft Proposal

Use this skill when the Inspection is complete and the Proposal issue is unblocked.

## Prerequisites

- Inspection is complete with findings posted
- Proposal issue exists with empty `proposal` and `retainer-pitch` documents
- Current pricing is known (check Offer Development project if unsure)

## Critical Rules

1. **Plain language, no jargon** â€” the customer is not technical
2. **Price every fix** â€” total must be clear and justified
3. **Payment is upfront** â€” after inspection, before work begins. No exceptions.
4. **Board approves before sending** â€” draft goes to `in_review`, board reviews, then Concierge sends
5. **Never quote retainer prices from memory** â€” verify current tiers: $299 / $599 / $999
6. **Combined payment option** â€” one-time fix payment + subscription selection

## Workflow

### Step 1 â€” Gather Inputs

1. Read the Inspection issue diagnostic report
2. Read the Company Intake `intake` document for client details
3. Read the Job Summary for any additional context
4. Check current pricing in the Offer Development project

### Step 2 â€” Draft the Proposal

Save as document key `proposal` on the Proposal issue:

```
# Fix-It Proposal: [Client Name]

## What We Found
[2-3 paragraphs summarizing the inspection findings in plain language.
Focus on impact to the customer's business, not technical details.]

## What We Will Fix

| # | Issue | What We Will Do | Est. Time |
|---|-------|-----------------|----------|
| 1 | [Issue] | [Plain language fix description] | [X hrs] |
| 2 | ... | ... | ... |

## Price
| Component | Amount |
|-----------|--------|
| Fix-it package ([N] items) | $[TOTAL] |
| Monthly maintenance (optional) | $[TIER]/mo |

Total one-time: $[AMOUNT]
Payment due before work begins.

## Timeline
Estimated [X] business days from payment receipt.

## What We Need From You
1. Payment for the fix-it package
2. WordPress admin credentials
3. Hosting panel access (SiteGround/cPanel)
4. [Any other access needed]

## What Happens Next
1. You approve this proposal and pay the invoice
2. You send us your credentials
3. We fix everything on a staging copy first
4. You review each fix before we push to your live site
5. We send you a completion report with everything we did
```

### Step 3 â€” Draft the Retainer Pitch

Save as document key `retainer-pitch` on the Proposal issue:

```
# Monthly Maintenance Plans

Your site needs ongoing care. Plugins go stale, emails stop working,
things break quietly. A monthly plan prevents problems before they start.

| Plan | Price | Includes |
|------|-------|----------|
| Starter | $299/mo | Updates, health check, email monitoring, monthly report |
| Growth | $599/mo | Starter + 2 dev hours, priority support, monthly reporting |
| Scale | $999/mo | Growth + 5 dev hours, strategic consulting, dedicated support |

Add-on development: $150/hr beyond included hours.

Subscription billing starts the month after your fix-it is complete.
```

### Step 4 â€” Submit for Board Review

1. Update the Proposal issue status to `in_review`
2. Post a comment: "Proposal and retainer pitch drafted. Ready for board review."
3. Wait for board approval before Concierge sends to customer

### Step 5 â€” After Board Approval

Concierge sends the proposal + invoice link to the customer.

When payment is confirmed:
1. Update Company Intake with selected subscription tier
2. Close the `Payment Received` gate under Open Work
3. Notify CTO that payment is complete

## References

- PROJECT_SOP.md Phase 3 (Proposal + Payment)
- Current pricing: Offer Development project (DEV-10)
