---
name: run-inspection
description: >
  Run a structured diagnostic inspection on a client site. Produces a diagnostic
  report, fix list with severity/effort estimates, subscription recommendation,
  and out-of-scope observations. Supports free basic (remote) and advanced
  (credentialed) tiers. Assigned to: CTO.
---

# Run Inspection

Use this skill when the CTO picks up a `Job #N Inspection` issue.

## Prerequisites

- Inspection issue exists and is assigned to you
- For basic inspection: site URL is available from the intake document
- For advanced inspection: admin credentials have been provided

## Critical Rules

1. **Never touch production** â€” inspection is read-only observation
2. **Post all findings as a structured comment** on the inspection issue
3. **Every finding needs severity and effort** â€” High/Medium/Low severity, hours estimate
4. **Subscription recommendation is required** â€” which tier fits the customer
5. **Out-of-scope observations feed the retainer pitch** â€” capture everything

## Inspection Tiers

### Free Basic Inspection (default for inbound leads)

Remote-only, no credentials required:
- Check for visible errors, broken templates, console errors
- Review page source for plugin footprint
- Test navigation, cart, checkout flow
- Check SSL certificate status
- Check mobile responsiveness
- Note visible plugin versions and known vulnerabilities

### Advanced Diagnostic (requires admin credentials)

Everything in basic plus:
- Plugin compatibility audit (active plugins, versions, known conflicts)
- Template override review (child theme customizations)
- Email delivery check (WooCommerce order notifications)
- Error log analysis (wp-content/debug.log)
- WP-CLI system checks (wp core verify-checksums, wp plugin list)
- Database health (wp db check)
- For WordPress: assess ongoing maintenance needs for subscription tier

## Workflow

### Step 1 â€” Read the Intake Document

1. Find the Company Intake issue in the project
2. Read the `intake` document for client details, site URL, platform
3. Determine inspection tier (basic unless credentials are available)

### Step 2 â€” Run the Inspection

For WordPress/WooCommerce sites, check each area and document findings:

| Area | What to Check |
|------|---------------|
| Frontend | Homepage, shop, product pages, cart, checkout |
| Navigation | Menu structure, category pages, search |
| Orders | Order notification emails, order page layout |
| Plugins | Active count, outdated versions, known conflicts |
| Theme | Template overrides, child theme health |
| Security | SSL, admin URL exposure, user enumeration |
| Performance | Page load time, image optimization, caching |
| Email | SMTP configuration, deliverability |

### Step 3 â€” Produce the Diagnostic Report

Post as a structured comment on the Inspection issue:

```
## Diagnostic Report: [Client Name]

### Environment
| Field | Value |
|-------|-------|
| Platform | [WordPress X.X / WooCommerce X.X] |
| Theme | [Theme name and version] |
| Active Plugins | [count] |
| PHP Version | [X.X] |
| Hosting | [Provider] |

### Findings

| # | Issue | Severity | Effort | Notes |
|---|-------|----------|--------|-------|
| 1 | [Issue description] | High/Med/Low | [X hrs] | [Details] |
| 2 | ... | ... | ... | ... |

### Subscription Recommendation
[Which tier and why â€” $299 / $599 / $999]

### Out-of-Scope Observations
- [Items noticed beyond immediate fixes]
- [These feed the summary and retainer pitch]

### Recommended Fix Order
1. [Fix to do first and why]
2. [Fix to do second]
...
```

### Step 4 â€” Update the Job Summary

Use the `update-summary` skill to add inspection findings to the Job Summary document.

### Step 5 â€” Unblock the Proposal

Post a comment on the Proposal issue: "Inspection complete. Findings posted on [Inspection issue]. Ready for proposal drafting."

Update the Proposal issue status from `blocked` to `todo`.

## References

- PROJECT_SOP.md Phase 2 (Inspection)
- DEV-90 (Job Summary Template)
