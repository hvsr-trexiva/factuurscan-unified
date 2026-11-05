# Salesdashboard en activering

## Werkplek

`/sales` is uitsluitend toegankelijk voor de ingestelde `ADMIN_EMAIL` via de bestaande ChatGPT-aanmelding. Alle data- en wijzigingsroutes controleren eigenaarstoegang; de publieke website blijft publiek. `/beheer` linkt naar het dashboard. Geen fictieve klanten of cijfers. Nieuwe ontvangst- en opvolgmails bewaren onderwerp en tekst in de afgeschermde audit, met privé-tokens geredigeerd; leveranciersmails krijgen in dit scherm alleen metadata. De nieuwste 1.000 actieve dossiers binnen de gekozen periode; detailwachtrijen hebben zichtbare limieten. Grafiekdagen zijn UTC, afspraken Europe/Brussels. Pipelinekolommen zijn huidige posities, geen cumulatieve funnelconversies. Aanlevering is geen leveranciersacceptatie. Gespreksopdracht is geen bewezen gesprek.

Websiteaanvragen, bestanden, workflows, contracthandtekeningen, mailwachtrijen en oproepen komen uit de bestaande D1-tabellen. UTM-velden worden alleen bij indiening uit de huidige URL meegegeven; geen persistente cross-site toewijzing. Een bezoek zonder UTM kan daardoor als website verschijnen. Import blijft beschikbaar met kolomkoppeling en controle, zonder automatisch geërfde contacttoestemming.

## Externe leadadapter

`POST /api/platform/leads`, Authorization Bearer met de bestaande PLATFORM_TOKEN. Dit is een serveradapter, geen native Meta-webhook. De adapter moet native handtekeningen valideren, authenticiteit/toestemming controleren en alleen geverifieerde velden mappen. Nooit PLATFORM_TOKEN in een formulier, advertentie of browser plaatsen. Vereiste JSON:

- externalId: stabiele ID per kanaal, maximaal160 tekens; dezelfde combinatie channel/externalId is idempotent.
- channel: meta, google, linkedin, partner, hubspot of other; campaign optioneel.
- company, name, email; phone en sector optioneel.
- analysisRequested: true.
- consent: {text, at, sourceUrl}; tijdstip maximaal zeven dagen oud; HTTPS-bron en exacte toestemmingsverklaring vereist.
- aiCall en marketing: standaardfalse. Voor aiCall zijn telefoon en callbackAt vereist, met bestaande Belgische slotcontrole. De adapter moet daarvoor afzonderlijke specifieke toestemming aantonen.

Er worden geen advertentieaccounts of campagnes aangemaakt. Geen advertentiebudget of CAC/ROAS wordt verzonnen. De privélink wordt versleuteld opgeslagen met AES-GCM en een sleutel afgeleid van RATE_LIMIT_SECRET. Sleutelrotatie vereist migratie van deze enveloppen. Mail stuurt de privélink; het dashboard geeft de versleutelde envelop niet terug. `/aanleveren` en `/api/lead-invoice` voegen facturen aan hetzelfde dossier toe, met privé-tokencontrole en vervolgens een analysejob. Het is geen OCR-engine.

## E-mail en opvolging

Bestaande Postmark-instellingen zijn vereist. EMAIL_ENABLED blijft op de bestaande waarde staan. Externe analyseaanvragen kunnen een ontvangstmail met privé-aanleverlink krijgen. Ontbreekt de factuur nog, dan plant de runner na24en72uur maximaal twee verschillende herinneringen binnen zeven dagen. Late eerste uitvoering slaat de eerste stap over. Pauze, stopverzoek, verlopen opdracht, ingetrokken toestemming, bestaande workflow of aangeleverde documenten blokkeren de vervolgmail bij verzending opnieuw. Imports worden uitgesloten. Provider time-outs of onbekende verzendresultaten worden niet blind herhaald.

`POST /api/postmark/webhook` accepteert Delivery, Bounce, SpamComplaint, Open en Click. Configureer in Postmark een geheime HTTP-header `x-postmark-webhook-secret` gelijk aan de nieuwe secret POSTMARK_WEBHOOK_SECRET. Alleen bestaande providerbericht-ID's worden verwerkt, zonder hele berichten of tracking-URL's op te slaan. Events zijn idempotent. Delivery betekent ontvangende serveraanvaarding. Bounce/spam onderdrukt vervolgcontact en annuleert wachtende herinneringen. Opentracking en kliktracking blijven standaard uit in de verzendadapter; een opensignaal is geen leesbewijs. Inkomende e-mailantwoorden en automatische classificatie daarvan zijn nog niet aangesloten.

De klant kan via de stoplink op zijn privé-aanleverpagina de automatische opvolging pauzeren. `/api/sales-stop` controleert het dossier-token en annuleert wachtende mails en oproepen. Reeds extern geaccepteerde acties kunnen niet worden ingetrokken via deze knop. De eigenaar kan pauzeren/hervatten; hervatten replayt geannuleerde acties niet.

## Achtergrondverwerking

`POST /api/platform/sales-run`, Authorization Bearer PLATFORM_TOKEN. Verwerkt maximaal100 kandidaatdossiers voor herinneringen, maximaal vier mails en één AI-callback per uitvoering. De eigenaar kan dezelfde runner handmatig uitvoeren in het dashboard. Dit is geen scheduler. Voor productie een beveiligde externe scheduler aansluiten, bijvoorbeeld elke vijf minuten, met geheim beheer, foutmeldingen en monitoring. Er is geen periodieke taak geactiveerd zolang de unattended toegang niet is geverifieerd.

OCR en vergelijking vereisen de bestaande externe analyseworker op `/api/platform`. Gevalideerde offertes via `/api/platform/workflow` moeten alle bestaande gates en schriftelijke leveranciersacceptatie doorstaan. Signingworker gebruikt de bestaande platformacties; PandaDoc-webhook archiveert en verifieert handtekeningen. Geen eigen handtekeningfabricage of automatische acceptatie van leveranciersvoorwaarden toegevoegd.

## Benodigde aansluitingen

Postmark-account en geverifieerde afzender; webhooksecret en events; analyse/OCR-worker en gewenste provider; Vapi EU-account, assistent/nummer, privacyvrijgave en uitkomstwebhook; PandaDoc-account, templates, webhook en leveranciersafspraken; native Meta/Google/partner-credentials voor een serveradapter; externe scheduler. HubSpot wordt pas als extra CRM aangesloten na keuze van account, objectmapping en toegang. Geen data naar HubSpot verzonden.

Geen claim van onafhankelijke EU-certificering. Bestaande bewaartermijnen blijven gelden: standaard dertig dagen voor aanvragen; import één jaar; ondertekende dossiers vereisen bewaarbeoordeling. Verwerkersafspraken en echte providerregio's moeten bij activering worden vastgesteld.


## Reviewerrol

`DASHBOARD_REVIEWER_EMAILS` bevat expliciet toegestane, komma-gescheiden ChatGPT-e-mailadressen (runtime secret). Alleen exact genormaliseerde adresmatches krijgen leestoegang tot `/sales` en de benodigde GET-routes voor sales, energieprofielen, klantopvolging, energie-export en dossierbestanden. Beheerpagina, CRM-import, alle mutaties en runners blijven uitsluitend voor `ADMIN_EMAIL`. De UI toont reviewmodus en schakelt schrijfformulieren uit; serverautorisatie is doorslaggevend. Bestanden en documentlijsten gebruiken de bestaande dossierbewaargrens. Verwijder het adres uit de runtimeconfiguratie en deploy opnieuw om toegang in te trekken. Geen apart wachtwoord, bearerlink of gedeelde eigenaarsessie. Authenticatie verloopt via de Sites ChatGPT-aanmelding; dit logt een andere AI-toepassing niet automatisch in.
