# October 2026 business reference extension

The 20 original supplied rows and four own offers are preserved. An additional 33 supplier/energy/type maxima are extracted from 89 usable business products in the official October VNR workbook. `scripts/import-reference-tariffs.py` reproduces extraction, formula evaluation and provenance. Workbook SHA-256 is in `data/tariff-reference-audit.json`. The ten covered suppliers are a verified business-price selection, not a verified current top-ten ranking by customers.

Comparison uses energy unit prices only, excludes networks/taxes/certificates/fixed fees/discounts, shows the selected reference product and warns that the customer's actual contract may be cheaper. No household-only EnergyVision prices or dynamic products are substituted. Product eligibility remains relevant, notably minimum annual use. Negative savings remain negative. Own monthly offers still require monthly maintenance; stale-month gates are retained.

The dashboard reads submitted website comparisons from the same request database. Unsubmitted comparison drafts are stored only in sessionStorage, bounded to 24 hours, without automatic CRM capture or marketing consent. Submitted requests retain their existing case access protections and retention workflow.

The proposed start is the first month day at least 30 calendar days ahead, based on Brussels calendar date. This is a planning rule, not a claim that every Belgian contract legally requires 30 days. Supplier acceptance and existing terms remain to be checked.

The backend proposal queue freezes document hashes and profile scope. It may attach the confirmed own preparation instruction and an available, reviewed, current supplier PDF matching the signer. An own instruction is not a supplier contract. Missing supplier documents are not fabricated. Postmark, supplier routes and signing configuration must be active before live delivery/signing can be certified.

Portal links open official websites/help/customer areas for customer-driven PDF retrieval. They do not authenticate or download on behalf of customers. Logos are locally hosted; TotalEnergies and Elegant retain a generic brand fallback where a verified downloadable asset was unavailable. Ecopower and Ecofix images are cropped from official supplier documents, used only for branding.

Privacy copy and explicit-choice separation are included. Full GDPR compliance still requires verified controller/company details, lawful processing and retention decisions, processor agreements and operational handling of data rights; a privacy page alone does not certify compliance. No live email/call or browser visual verification was performed in this change. Backend provider calls are mocked in tests.
