# Meter, solar and heating intake

The comparison and private checkout collect solar yes/no/unknown, digital/analogue/AMR meter, single/day-night/exclusive-night register, floor area in m², and heating. Checkout also exposes annual day/night/exclusive-night consumption and solar capacity/export fields. Values remain attached to each customer location and enterprise. Admin energy editing exposes heating and area as well.

`SimpleEnergy.situation` and optional `areaScenario` are validated server-side and saved to the case. An area scenario is explicitly user-selected m² × kWh/m², not a measured value, sector benchmark or a copy of OCTA+'s undisclosed estimation method. There is no automatic heating/solar multiplier. The server verifies scenario arithmetic, area consistency and the existing 100,000 kWh cap. Source flags distinguish customer entries, band/area scenarios and annual invoice suggestions. New invoices replace scenario totals, retain customer corrections, and flag incompatible register totals for review.

The supplied own October table has single-rate prices and no day/night or exclusive-night prices. The existing price arithmetic is unchanged: apply that single rate to annual total grid consumption, with a visible note for non-single registers. Do not claim register-specific, injection, total bill or net tariff calculations. No unsupported tariffs are invented.

The PDF-text extractor recognises explicit labelled location facts only. Vision JSON and its instructions include the same nullable fields. Missing or ambiguous values remain null/unknown; an export price alone is not evidence that the customer has solar panels. Photo/scan OCR still requires the configured backend OCR credentials. Users review all suggestions. Actual contract signing and e-mail still require existing provider configuration.

After the savings CTA, two prominent side-by-side routes are displayed: manual entry first, bill upload second. QR camera upload and dictation remain available. A comparison-page shortcut also lets customers with unknown figures upload a bill without choosing an area scenario.

OCTA+ survey https://simulator.octaplus.be/survey?partner=website&lng=nl and lead https://simulator.octaplus.be/lead were inspected through public retrieval. Only the survey stage titles were accessible; the lead endpoint was unavailable. Full field or formula parity is unverified. No supplier submission was made.
