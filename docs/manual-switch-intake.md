# Manual switch intake

Manual selection scrolls and focuses the form at the top of the viewport. Four short groups cover the signer (first/last name and authority), company (one enterprise/VAT input, legal form and VAT status), connections (supply address, EANs, meter status) and preparation confirmation (desired date/payment preference). Existing contact email/phone are displayed, not requested again. Detailed energy inputs remain available in an optional disclosure. Invoice upload, speech, QR and all existing comparison paths remain.

First and last names are separate and required at confirmation. The server reconstructs the canonical signing name. Legacy invoice full names are displayed as review hints without guessing how to split a multi-part name. Bank and supplier-specific details remain part of the separately released supplier contract; a payment preference is not a SEPA mandate.

The EAN input fixes the prefix 54, allows 16 remaining digits, supports pasting the full code, shows digit count and checks its check digit. Incomplete/incorrect/wrong-prefix EANs are rejected on save by the existing server schema. Empty optional energy EANs are allowed, but confirmation still requires at least one EAN per connection. Duplicate EANs across the portfolio are rejected. Extra connections can share the same company and address; adding one copies the address but never the EAN or consumption. Existing limit: 10 connections, one electricity and one gas EAN per connection.

Billing can reuse the first supply address per business; server normalization enforces the selected address. Explicit invoice billing addresses are preserved when first read. Companies and locations can still have separate billing addresses.

KBO lookup automatically starts after a complete checksum-valid enterprise number, debounced by 600 ms. Only verified API results can populate the company through explicit selection. The existing server still requires configured KBO credentials. If unavailable, manual entry remains possible. No name-only lookup, VAT registration proof or meter ownership verification is invented.

Fluvius exposes a customer portal and an official EAN request form. The UI links to Mijn Fluvius and retains the scoped follow-up request. There is no automatic authenticated portal import or credential collection.

Reference field inventory (not current price/contract terms):
- https://www.octaplus.be/public/uploaded/pdf/documents/EG_inschrijvingsformulier.pdf — professional identity, legal form, signer names, contact/address, EAN(s), meter status, supplier, start date, payment preferences.
- https://www.engie.be/nl/professionals/contact/ — business identity, enterprise/VAT number, address and meter information.
- https://www.fluvius.be/nl/veelgestelde-vragen/veelgestelde-vragen-over-de-ean-code — 18 digits starting 54, EAN distinct from meter number.
- https://www.fluvius.be/nl/contact/contactformulier/ean-code — official EAN request route.

These general fields do not establish that every supplier accepts a dossier without any additional provider-specific information or verification.
