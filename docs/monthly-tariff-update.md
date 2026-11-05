# Monthly tariffs - operating procedure

Start checks on the first calendar day of each month; retry daily if the source has not published the month. The official VNR workbook may appear later in the month (October source published on 15 October), so do not promise publication on day 1.

1. Discover the current VNR open-data download from its official page. Save the original workbook and SHA-256. Verify month, business customer category, energy component, currency/unit, fixed versus variable and monthly versus annual estimate. Never use household rates or old month prices as current.
2. Obtain the authorized current own offer sheet (OCTA+/Energy Together) and its applicable product/contract terms. If not available, report the missing sheet and keep current-month publication blocked. Never infer own offer rates from competitor cards.
3. Adapt/reuse scripts/import-reference-tariffs.py for the new source month. It is deliberately October-specific now: do not merely rename dates. Preserve prior source snapshots and signed customer versions; select highest eligible reviewed reference per supplier/type and lowest eligible own offer. Retain negative differences and unavailable products. Record minima separately for audit; do not change the approved reference strategy silently.
4. Run scripts/audit-supplier-matrix.cjs with an output path, all test scripts, TypeScript and production build. Check all 39 dropdown names, fixed/variable/unknown, both energies and consumption boundaries. Prices without a matching reviewed source remain unavailable.
5. Prepare fresh Excel/PDF with source hashes, min/max, explicit cost basis and offer validity. Publish only verified complete current-month data. Record published month and source SHA in the change report. Missing sources trigger an update report, not fabricated savings.
6. Check once daily from the first until the current month has been released; later runs are read-only unless a source correction is published. Do not contact customers/suppliers or change live secrets as part of price maintenance.

The recurring task is a tariff verification/update task, not the sales runner. Background email/voice queues need an actual authenticated scheduler calling POST /api/platform/sales-run plus a separately authorized worker for analysis/signing/bridge, with retry and result reporting. Never put secrets in the schedule prompt.

## Runner deployment

`scripts/run-sales-automation.mjs` is ready for a real scheduled host (for example the existing Render service). Inject FACTUURSCAN_ORIGIN and PLATFORM_TOKEN securely; run every 5 minutes in a single scheduler. Do not put the token in source, command arguments or logs. Keep EMAIL_ENABLED and VOICE_ENABLED off until their real provider tests pass. A source script is not an installed cron job. This audit does not activate a host schedule or contact real customers. The periodic task for tariff research is separate.
