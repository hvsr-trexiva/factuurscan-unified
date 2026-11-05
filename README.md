# FactuurScan unified Node application — 5 November 2026

One Next.js Node 24 app. Website `/`, admin dashboard `/admin`, customer review `/overstap-afronden`, all API routes and the same calculation/document/email code in one deployment. No Python service, Cloudflare account or separate CRM deployment is required.

## Hostinger Web App setup

Upload this ZIP using Hostinger **Web App → Node.js**, select Next.js and **Node 24**. Project root is the extracted folder containing package.json. Install: `npm ci`; build: `npm run build`; start: `npm start`. Hostinger supplies PORT. Configure environment variables in hPanel from `.env.example`; do not upload production secrets.

Required: ADMIN_EMAIL, ADMIN_PASSWORD (12+ characters), AUTH_SECRET, RATE_LIMIT_SECRET and CRON_SECRET (each secret at least 32 random characters). Set DATA_DIRECTORY to an **absolute writable path outside the deployment directory**, for example `/home/ACCOUNT/factuurscan-data`. This holds the SQLite database and private invoice/PDF objects. Confirm with Hostinger that the directory survives redeployment. Back up this directory, including the database, independently. A ZIP contains application source, not customer data.

Open `/api/health`, then `/admin` and sign in. Database tables migrate automatically under an exclusive SQLite transaction. One instance should use the database; do not scale replicas across hosts. SQLite and private files suit the initial single-instance test deployment.

## Automatic processing

Configure an authenticated Hostinger scheduled task every minute:

```
curl --fail --silent --show-error --max-time 110 -X POST -H 'Authorization: Bearer YOUR_CRON_SECRET' https://YOUR_DOMAIN/api/cron
```

Keep the secret in the private scheduler configuration. No unauthenticated cron URL exists. Cron analyzes up to three waiting invoice cases, queues proposals with the existing extraction/profile logic, runs the email outbox and voice dispatch, and queues a follow-up after 48 hours for accepted proposals without a recorded reply/signature. Follow-up processing stops for recorded pauses/withdrawals/suppression; the 48-hour follow-up is queued once and only within 14 days. Calls additionally require recorded consent, provider configuration and Brussels business hours. Ambiguous provider delivery results remain for review to avoid sending duplicates.

## Providers and documents

Set OPENAI_API_KEY for invoice extraction. Configure verified Postmark sender and EMAIL_ENABLED=true for sending; MAIL_BCC adds an internal copy. Configure Postmark inbound URL `/api/postmark/inbound` and delivery URL `/api/postmark/webhook` with the corresponding secrets; inbound replies must include exactly one case reference in the subject and match that case’s contact email; PDF/JPEG/PNG attachments enter the shared extraction flow. Set the voice provider variables for Vapi or the supplied ElevenLabs adapter. Provider calls were not sent during local checks.

The original website calculation and tariff data remain in `lib/own-offers.ts` and `data/own-monthly-tariffs.json`. The supplied table is October 2026. Set NEXT_PUBLIC_ALLOW_HISTORICAL_TARIFFS=true **before building** for historical comparison testing; historical results carry the dated test label. Set false and supply a reviewed current table before real offers. The original comparison uses energy-only supplier benchmarks and keeps the monthly budget separate. It does not multiply an energy-only discount across taxes and the full invoice.

The existing document UI supports uploading supplier PDFs, personalization/mapping and separate customer review. Configure current supplier agreement PDFs, field maps and ENERGY_DOCUMENT_ROUTES_JSON using the included original documentation. PandaDoc remains supported. An optional simple declaration can be enabled with SIMPLE_SIGNING_ENABLED=true plus a comma-separated SIMPLE_SIGNING_ACCEPTED_SUPPLIERS list after the supplier accepts that method; it stores a signed PDF with declaration/evidence, document hash, signer, timestamp and request details. It does not independently verify the signer's identity. Service agreements already use the simple declaration flow.

The Node port preserves the provided website UI, customer flow, embedded comparison/proposal PDF creation, CRM panels and integration adapters. API credentials alone do not supply absent supplier contract templates, field mappings or provider account approval. Automatic supplier-template selection for every product and WhatsApp invoice ingestion require further implementation/configuration; there is no claim of a live end-to-end provider test.

## Verification performed

Production Next build and TypeScript checks; isolated tests for database migrations/atomic rollback, private object bytes/path traversal and admin session tamper rejection. Local HTTP smoke checks are recorded in DELIVERY-NOTES.md. No live customer emails/calls/signatures were triggered.
