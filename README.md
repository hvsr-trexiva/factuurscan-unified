# FactuurScan — Hostinger MySQL revision, 5 November 2026

One Next.js Node 24 application: website `/`, dashboard `/admin`. This revision removes SQLite and all requirements for local writable application folders. MySQL holds case records and private invoice/PDF bytes in transactional chunks. Use this for the initial single-instance test; database storage consumption includes uploaded files. The SQL schema is initialized lazily on the first database operation, never during build. Existing tables are preserved with CREATE TABLE IF NOT EXISTS. Use the newly created empty database, not an unrelated production database.

## Update the GitHub repository

Replace the existing repository files with this ZIP's contents, keeping package.json at the repository root. Commit and push. Hostinger settings: Next.js, Node 24, npm, root `./`, build `npm run build`, output `.next`, start `npm start` if prompted. Hostinger supplies PORT.

## Change the Hostinger environment

Remove `DATA_DIRECTORY`. It is no longer used. Add:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=u508096037_admin
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_NAME=u508096037_factuurscan
```

Confirm DB_HOST with Hostinger for the Node runtime; the support-provided 127.0.0.1 is only correct if the app runtime can reach the database there. Enter the password privately in hPanel. The app initializes the required tables automatically and needs CREATE/SELECT/INSERT/UPDATE/DELETE permissions in that database. MySQL must support JSON_EXTRACT/JSON_SET and named locks (modern MySQL/MariaDB).

Keep the ADMIN_EMAIL, ADMIN_PASSWORD, AUTH_SECRET, RATE_LIMIT_SECRET, CRON_SECRET, OpenAI, Postmark and ElevenLabs credentials you already entered. `.env.example` lists supported names. Do not upload a real `.env` or commit credentials. Optional variables can be removed from hPanel if you do not have values for them; blank rows in its form need not be kept. Never use fake phone numbers.

For the initial test, keep `EMAIL_ENABLED=false`, `VOICE_ENABLED=false`, `SIMPLE_SIGNING_ENABLED=false`. Set the OpenAI key and invoice model to enable extraction; AI_READY is a display readiness flag. Historical tariff comparison tests require NEXT_PUBLIC_ALLOW_HISTORICAL_TARIFFS=true at build time. The supplied table is October 2026 and is not a verified current offer.

## After deployment

Visit `/api/health` and confirm database/storage report true. Sign in at `/admin`. Test one invoice before activating external delivery. Do not assume credentials alone verify the entire flow.

Create an authenticated scheduled POST every minute to `https://YOUR_DOMAIN/api/cron`, with header `Authorization: Bearer YOUR_CRON_SECRET`. The endpoint processes queued invoices/proposals and existing email/voice adapters, with a bounded 48-hour proposal reminder. Configure provider webhooks separately. ElevenLabs uses VOICE_PROVIDER=elevenlabs and the ELEVENLABS_* settings in .env.example; its phone ID is the ElevenLabs ID for the Twilio-connected number.

MySQL stores original and generated files privately in `node_objects` and `node_object_chunks`. They are accessed through existing authenticated case endpoints, not public file URLs. Back up the entire database. For larger production file volumes, a separate private object store should be implemented instead of retaining all bytes in MySQL.

## Scope and verification

This fixes the Hostinger filesystem build error and ports persistence to MySQL. Website UI, comparison model and existing case/document/email/provider workflows are retained. Automatic agreement template selection for every supplier product and full WhatsApp invoice ingestion remain unfinished. Supplier PDFs, mappings and acceptance routes still need configuring. This delivery is not a claim that the whole business flow is complete.

Production build and SQL/session compatibility checks are run for this revision. No live Hostinger MySQL connection or provider sending was tested here: private runtime database credentials are entered only in Hostinger. Live connection and JSON/version compatibility must be checked through /api/health and a case smoke test after deployment.
