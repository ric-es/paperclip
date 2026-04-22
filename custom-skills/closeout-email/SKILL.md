---
name: closeout-email
description: >
  Job Closeout Process. When a job is complete, generate the closeout email
  draft, branded PDF, locate or create the Stripe invoice, attach all
  artifacts to the Job Summary issue, and include a return-service pitch.
  Triggered by CEO when a job is ready to close. Renamed from "closeout-email"
  to reflect full process scope.
---

# Job Closeout Process

Use this skill when the CEO signals that a job is ready for closeout. The deliverables are:
1. A plain-text closeout email draft (saved as a Paperclip issue document)
2. A branded PDF version of the email (attached to the Job Summary issue)
3. The Stripe invoice PDF (attached to the Job Summary issue)
4. The Stripe payment link embedded in the email

## Prerequisites

- `STRIPE_SECRET_KEY` must be set in the agent's environment (restricted key `rk_live_` with permissions: Customers R/W, Invoices R/W, Payment Links R/W, Products R/W, Prices R/W, Subscriptions R/W, Subscription Items R/W).
- The job's fix issues must be in `done` or `cancelled` status.
- The CEO must have confirmed the job is ready to close.

## Critical Rules (Read First)

1. **Deliverables are Paperclip documents, not files on disk.** Use `PUT /api/issues/:issueId/documents/:key` to save drafts. Never write standalone HTML files or create nested issues for deliverables.
2. **All drafts go on the Job Summary issue** — not on sub-issues. The Job Summary is the single source of truth for the engagement.
3. **Always check offer/SOP docs for current pricing.** Never use retainer prices from memory. Current tiers: $299 / $599 / $999 per month. Verify against the offer development project before every closeout.
4. **Always apply the brand guide** (`docs/BRAND_GUIDE.md`) to all PDFs. Colors, fonts, header/footer format are mandatory. Never generate a PDF without brand compliance.
5. **Use Platypus (flow-based layout)** for PDF generation — not canvas-based. This prevents table overflow, clipped data, and layout collisions.
6. **Never send without board approval.** Draft → board review → explicit "send" approval → send.
7. **Sign as:** Customer Concierge / dev@nodenetwork.ai / NodeNetwork.

## Workflow

### Step 1 — Gather Job Summary

1. Fetch the Job Summary issue and all child issues for this job.
2. Fetch the original proposal document to get the exact scope items and pricing.
3. Categorize all work into three buckets:
   - **Original scope (confirmed done):** The exact items from the proposal, listed as bullet points matching the proposal language.
   - **Out-of-scope extras (no additional charge):** Ancillary fixes completed during the workflow that were not in the proposal. Summarize briefly — one short paragraph, not individual bullets.
   - **Open items (need separate job/billing):** Issues identified during the engagement that still need work. Each should be a bullet point. These seed future work.

### Step 2 — Stripe Invoice

1. Search for an existing invoice for this client/job:
   ```
   GET https://api.stripe.com/v1/invoices?customer={customer_id}
   ```
   Or search by metadata:
   ```
   GET https://api.stripe.com/v1/invoices/search?query=metadata["job_id"]:"{job_identifier}"
   ```
2. If found and `open` or `draft`, use its `hosted_invoice_url` as the payment link.
3. If no invoice exists, create one:
   - Create invoice with `collection_method: send_invoice`, `days_until_due: 7`
   - Add line item with job description and amount
   - Finalize the invoice
4. **Verify the invoice number** — check the actual Stripe invoice number, do not guess or append `-/00`.
5. Download the Stripe-generated invoice PDF from `invoice_pdf` URL.
6. Extract `hosted_invoice_url` for the email.

### Step 3 — Draft the Email

Save as a Paperclip document on the **Job Summary issue** with key `job-closeout-email`.

**Email format (board-approved):**

```
Subject: Your Site Is All Set — {Client First Name} | NodeNetwork

Hi {Client First Name},

Thank you for trusting us with {domain}. Everything is wrapped up and your
site is in good shape. Here is a summary of what we completed.

WHAT WE COMPLETED
{numbered list — one line per original proposal item, confirmed done}

EXTRA WORK WE DID (NO ADDITIONAL CHARGE)
{short paragraph summarizing ancillary fixes — plugin updates, cleanup, etc.
 Omit section entirely if none.}

ITEMS THAT STILL NEED ATTENTION
{bullet list of open items that need separate jobs/billing.
 Omit section entirely if none.}

INVOICE
Your invoice ({invoice_number}) for ${amount} is ready:
{hosted_invoice_url}

Payment is due within 7 days.

KEEPING YOUR SITE HEALTHY
We offer monthly maintenance plans to keep things running smoothly:

  $299/mo — Starter: monitoring, updates, minor fixes
  $599/mo — Growth: everything in Starter + priority support, monthly reporting
  $999/mo — Scale: everything in Growth + dedicated hours, strategic consulting

{Omit retainer section if client is already on a plan.}

SECURITY NOTE
We recommend rotating your SiteGround (or hosting) password now that the
engagement is complete. This is standard security hygiene.

Best regards,
Customer Concierge
dev@nodenetwork.ai
NodeNetwork
```

### Step 4 — Generate Branded PDF

1. Generate a PDF of the closeout email using the brand guide:
   - Colors: Navy #1A2B4A (headers), Electric Blue #2D7DD2 (accents/links), Light Gray #F7F9FC (table fills), Slate #64748B (secondary text), Border #E2E8F0
   - Font: Inter (Regular, Bold, Italic, BoldItalic)
   - Header: NodeNetwork logo area | Client Name — Job Closeout Email | Date
   - Footer: Confidential — Page N
   - Margins: 0.75in all sides
   - Layout engine: reportlab Platypus (flow-based, NOT canvas)
2. Use the saved template script if available (check `woocommerce-service/reports/closeout_email.py` or project templates).

### Step 5 — Attach Artifacts to Job Summary Issue

Upload to the **Job Summary issue** (not the closeout sub-issue):

1. The branded closeout email PDF: `{client-slug}-closeout-email.pdf`
2. The Stripe invoice PDF: `{client-slug}-invoice-{invoice_number}.pdf`

Use `POST /api/companies/:companyId/issues/:issueId/attachments` (multipart, field=file).

### Step 6 — Submit for Board Review

1. Post a comment on the Job Summary issue tagging the CEO, summarizing:
   - Email draft saved as document `job-closeout-email`
   - Both PDFs attached
   - Invoice number and payment link
2. Set the closeout issue status to `in_review`.
3. Wait for explicit board approval before sending.

### Step 7 — After Approval

1. Send the email to the client (manually by board, or via future email automation).
2. Mark the closeout issue as `done`.
3. Update project status if this was the final job in the engagement.
