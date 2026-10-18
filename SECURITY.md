# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue, discussion or pull request for security problems.

Report privately through GitHub:
**Security → Advisories → [Report a vulnerability](https://github.com/MD-ALL-SHAHRIA/ZELQUNE/security/advisories/new)**.

Include:
- what is affected (app, endpoint, file) and the impact;
- steps to reproduce or a proof of concept;
- any `x-request-id` values, logs or screenshots that help.

You will get an acknowledgement within 3 business days and a status update within 10. Please
give us reasonable time to fix the issue before any disclosure.

## Scope

All code in this repository: backend gateway and services, storefront, dashboard and
infrastructure configuration. Customer data (phone numbers, addresses, payment references) is
treated as sensitive.

## Handling secrets

Secrets live only in environment variables. Only `.env.example` files with dev placeholders are
committed. If you find a real secret in the history, report it as above so it can be rotated.
