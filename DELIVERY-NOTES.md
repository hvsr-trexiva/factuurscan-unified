# Delivery scope

This is a Node conversion of the complete supplied website, with its own integrated dashboard. The old separate Python/React CRM is not required or included. Website appearance, customer routes and original calculation model are retained. Admin authentication and D1/R2 bindings were replaced for Node hosting. The package contains no credentials, runtime customer database, node_modules or build output.

Implemented in this delivery: Node SQLite/D1 adapter with atomic migration/batch handling; private filesystem/R2 adapter; signed admin session cookie and login; /admin dashboard; authenticated cron processing of stored invoices and existing proposals/mail/voice adapters; one 48-hour proposal reminder and consent-aware call queue; optional internal email BCC; optional declared supplier simple signing; historical tariff test switch.

Remaining scope: automatic template selection/preparation for every supplier product; complete WhatsApp invoice ingestion; live email/OCR/provider call checks; current supplier-approved template/routing configuration. The ZIP is a single buildable app; it does not establish that every requested business automation is complete.

Tests: production build with TypeScript; isolated migrations/rollback, private file/path safety and session signature tests. Postmark inbound attachment ingestion was added for case-reference/sender matches. No external messages/calls were sent. The PDF text dependency emits a bundler warning and needs a real invoice OCR check after provider setup.

Local production HTTP checks passed: GET / 200; GET /admin 200; GET /api/health 200; admin API without session 403; password login 303; admin API with session 200; authenticated cron POST 200 with provider actions disabled.
