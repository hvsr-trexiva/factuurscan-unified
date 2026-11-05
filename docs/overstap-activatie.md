# Overstaproute — activering en operationele grenzen

De browserberekening gebruikt geen betaalde AI per vergelijking. Sites-facturatie en volumes zijn onbekend. PDF-tekstsuggesties zijn lokaal en hebben geen AI-API-kost. Het is geen volledige leveranciersneutrale OCR: scans/foto's en onduidelijke factuurlabels vragen verdere verwerking. Contactpersoon, tekenbevoegdheid en e-mailadres kunnen ontbreken op facturen en worden niet uit de leveranciersfooter geraden.

## Nog te configureren (uitsluitend via beveiligde runtime-instellingen)

- COMPANY_NUMBER: werkelijk ondernemingsnummer van Factuurscan BV.
- PANDADOC_API_KEY en PANDADOC_WEBHOOK_SECRET, productieaccount met API/embedded signing. Webhook: `/api/pandadoc/webhook`, event `document_completed_pdf_ready`. Gebruik het door PandaDoc afgegeven webhookgeheim. API-host is momenteel api.pandadoc.com; er wordt geen EU-datalocatie of QES-certificatie geclaimd.
- POSTMARK_SERVER_TOKEN, geverifieerde MAIL_FROM en MAIL_REPLY_TO, MAIL_NOTIFICATION_TO; pas daarna EMAIL_ENABLED=true. Test eerst met gecontroleerde eigen adressen. Een token mag nooit in Git of een chatbericht staan.
- SUPPLIER_ROUTES_JSON: JSON-array met een record per expliciet schriftelijk aanvaard product/sjabloon. Geen enkele leverancier is standaard toegestaan. Vereiste velden: supplier, product, recipient (geverifieerd contractaanleveradres), templateId, signerRole, templateSha256, termsSha256, signingMethod (`pandadoc_electronic`), acceptanceReference (verwijzing naar bewaarde schriftelijke aanleverafspraak), acceptanceSha256 (SHA-256 van die afspraak), validUntil (ISO-datetime), enabled=true. Elk record is strict; fouten blokkeren de gehele lijst. Meer dan één match blokkeert ook. Voor een leverancier die QES verlangt is deze adapter niet voldoende en mag er geen record worden geactiveerd.

## Werkelijke route

1. Bezoeker vergelijkt lokaal of uploadt factuur; beperkte tekst-PDF-voorinvulling, ontbrekende contactgegevens zelf bevestigen. Voorkeur voor product wordt als vraag opgeslagen, niet als contract of gegarandeerde prijs.
2. Geautoriseerde dossierverwerking levert een gecontroleerd voorstel via `/api/platform/workflow`. Alle verificatiepoorten, lagere vergelijkbare kost, geldigheid, tekenbevoegdheid en exacte leveranciersroute zijn vereist. De volledige automatische factuuranalyse is nog niet aangesloten; een menselijke of externe dossierverwerker moet het voorstel voorbereiden.
3. Privérapport toont het voorstel. Klant kiest contract bekijken. `/api/signing/session` maakt eenmaal een document van het goedgekeurde sjabloon, vult tokens en ondertekenrol, zet het stil klaar en opent een tijdelijke PandaDoc-sessie in de website. Er is geen klantaccount bij PandaDoc nodig. Een ambigue create/send wordt niet blind herhaald: status signing_needs_review.
4. Alleen een geldige HMAC-webhook plus servercontrole van providerstatus en ondertekenaar kan een ondertekende PDF archiveren. Providerbewijs en SHA-256 worden opgeslagen. De klant kan het document met de privérapportlink downloaden.
5. `supplier_contract` wordt uniek per dossier/versie in de bestaande mailwachtrij gezet. Verzending valideert de actuele route tegen de bij queueing gelogde routehash en leest de PDF opnieuw uit R2 voor integriteitscontrole. Maximaal 6 MiB PDF (Postmark max10 MB incl. base64 + bericht). Geen klantfacturen of losse bewijsmetadata worden automatisch meegestuurd. Een supplierroute moet deze contract-PDF-only aanlevering accepteren.
6. Mail wordt direct vanuit de webhook verwerkt zodra configuratie actief is. Wachtrijbeheer kan via `/beheer` opnieuw queued berichten verwerken. Een 429 wordt minimaal60s uitgesteld. Er is nog geen zelfstandige periodieke wachtrijrunner: bij 429/uitval moet beheer verwerken of een geautoriseerde runner worden aangesloten. Time-out/5xx/interrupted send wordt needs_review wegens mogelijk reeds aanvaard bericht: eerst bij Postmark reconciliëren, nooit blind opnieuw verzenden.
7. `supplier_emailed` betekent uitsluitend Postmark-provideracceptatie. Aanvaarding en startdatum door leverancier zijn afzonderlijke operationele bevestigingen; geen leverancierstatus-API is geconfigureerd. Bestaande externe `backup_signed`-actie blijft bestaan. R2-hashcontrole is geen onafhankelijke offline-back-up.

## Productieproef vóór activering

Met echte provider-sandboxaccounts en fictieve facturen: documentaanmaak, recipient/metadata match, verlopen aanbod, dubbelklik, webhook HMAC en replay, PDF-download en SHA, één e-mail met juiste bijlage naar gecontroleerde testontvanger, routewijziging en onbekende verzenduitkomst. Daarna één afgesproken proef met de leverancier inclusief schriftelijke ontvangst/acceptatie. Lokale mocks verifiëren gedrag maar bewijzen geen leveranciersonboarding.

Geen IP-adres of gewone PandaDoc-handtekening wordt als gekwalificeerde EU-handtekening voorgesteld. Een QES heeft wettelijke handgeschreven equivalentie; een gekozen leverancier moet nog steeds het product, zakelijke vertegenwoordiging en aanleverkanaal aanvaarden.
