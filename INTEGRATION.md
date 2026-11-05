# Factuurscan — activering en integratie

## Wat werkt
React-aanvraag met gecontroleerde factuurupload, D1-dossiers, R2-bestanden, optionele opvolgingskeuzes, Brussels-tijdslots, dossierbeheer, klantstatuslink en een beveiligde werkqueue. Bestanden worden als attachment aangeboden en nooit via openbare R2-URL's. De site blijft eigenaar-privé.

## Nog te activeren vóór echte klanten
1. Juridische onderneming, KBO/BTW/adres, privacycontact, zakelijk telefoonnummer en WhatsApp Business-nummer. Vul juridische pagina's daadwerkelijk aan; alleen omgevingsvariabelen invullen wijzigt hun tekst niet.
2. Verwerkersovereenkomsten, hosting/AI/CRM/mail/Meta/WhatsApp-dataflow en doorgiften documenteren; rechtenprocedure en dagelijkse verwijdering controleren. B2B contractrechten en eventuele leveranciervergoeding vooraf toelichten.
3. AI-platform met werkelijk geteste factuurextractie en actuele leveranciersdata. Geen claim “goedkoopste op de markt” zonder volledige aantoonbare dekking. Gebouwgebreken zijn hoogstens onderzoekssignalen. Menselijke controle vóór signing en laag-vertrouwenresultaten.
4. Python-service extern hosten (bijvoorbeeld uw bestaande infrastructuur). Sites draait React en Worker TypeScript, geen Python-processen. Configureer secrets bij de providers. De service ontvangt enkel geautoriseerde documenten. Malware-scan/sandbox PDF-verwerking toevoegen aan het platform vóór echte bestanden; signatures in de upload vormen geen malware-scan.
5. Transactionele e-mail aansluiten met geverifieerde afzender. SMTP is nog niet aangesloten. WhatsApp Cloud API, geaccepteerde templates en opt-in controleren. Momenteel bestaat alleen een configureerbare wa.me-link, geen WhatsApp-berichtbezorging.
6. Leveranciercontracten, mandaten en eigen contract-/signingprovider aansluiten. `SIGNING_ALLOWED_HOSTS` is komma-gescheiden zonder schema. Er wordt geen eigen handtekening nagebootst. Akkoord wordt gelogd en de ondertekening vindt bij de geverifieerde provider plaats.
7. Specialisten en beschikbaarheid bevestigen. De kalender registreert voorkeuren, geen vrije-agendasynchronisatie. AI-bellen alleen met aparte keuze, duidelijke AI-vermelding, menselijke fallback en toepasselijke communicatie-/AI-regels beoordelen.

## Runtime configuratie in Sites
`ADMIN_EMAIL`: eigenaar-account voor dossierbeheer, geen openbaar zakelijk e-mailadres.
`PLATFORM_TOKEN`, `RATE_LIMIT_SECRET`: sterke geheime waarden.
`WHATSAPP_NUMBER`: internationaal formaat zonder +, spaties of tekens.
`CONTACT_EMAIL`, `CONTACT_PHONE`, `COMPANY_NAME`, `COMPANY_NUMBER`, `COMPANY_ADDRESS`: echte waarden. Definitieve juridische pagina's eveneens bijwerken.
`META_PIXEL_ID`: alleen aansluiten na de cookie-/Meta-beoordeling.
`AI_READY`: pas true als de hele keten daadwerkelijk werkt. Huidige voorbeeldteksten moeten dan aangepast en gecontroleerd worden.
`SIGNING_ALLOWED_HOSTS`: uitsluitend vertrouwde signingprovider-hosts.
Geen geheimen in React, git, screenshots of analytics.

## Python draaien
Maak een virtuele omgeving en installeer `pip install -r backend/requirements.txt`. Configureer waarden uit `backend/config.example` als omgeving, zonder echte secrets in bronbestanden. Start `python backend/worker.py` voor polling en onderhoud, of `uvicorn backend.worker:app --host 0.0.0.0 --port 8000` achter HTTPS voor de result-webhook. De twee processen kunnen naast elkaar draaien. Niet vanuit een publieke browser aanroepen.

Een eigenaar-privé Site vereist naast onze platform-Bearer een Sites-servicecredential in `OAI-Sites-Authorization`; haal die via ondersteunde Sites-accountmogelijkheden. Alleen naar de exacte eigen Site sturen. Bij publiek klantgebruik moet de toegang bewust gewijzigd worden; dossier- en platformautorisatie blijft vereist.

## API contract
GET `/api/platform` met Authorization Bearer PLATFORM_TOKEN leaset één job atomair voor 15 minuten, maximaal 5 pogingen. `job.id` als idempotency key bij uw CRM gebruiken. Payload bevat sector, optionele oppervlakte, contact, vraag en afzonderlijke consents. Gebruik aiCall/whatsapp/marketing-keuzes strikt per doel. Een ontbreken van consent is geen toestemming.
GET `/api/platform?id=UUID&file=1` downloadt een document met dezelfde autorisatie. URLs niet naar derde domeinen sturen met credentials.
POST `/api/platform` verwacht `{jobId,leaseToken,report}`; callbackregistratie laat report weg. Een rapport heeft summary, basis, limitations, findings (`observed|signal|needs_data`), recommendations, offers en humanReviewed. Een offer heeft id, supplier, product, annualCost, currentAnnualCost, basis, validUntil, HTTPS source en nullable HTTPS signingUrl. Tariefbasis en herkomst moeten reproduceerbaar zijn. Het platform heeft zelf de taak om actuele tarieven te leveren; deze repo haalt geen marktprijzen op.
De Python-adapter POST naar uw configureerbare `/factuurscan/jobs`: multipart metadata+files voor analyse, JSON voor callback. Synchrone reactie `{report: ...}` of `{status:"registered"}`; asynchrone `{status:"accepted"}` vereist result-webhook binnen 15 minuten. Geen lease-verlenging geïmplementeerd. Langlopende jobs hebben aanpassing nodig.
POST Python `/results` vereist eigen BRIDGE_TOKEN en hetzelfde resultobject. Asynchrone rapporten worden opgeslagen; mailbezorging via dit webhook-pad is nog te implementeren. Synchronous polling ondersteunt SMTP. SMTP-fouten vereisen operatorherhaling en worden niet stil als succesvolle mail voorgesteld.
POST `/api/platform/maintenance` verwijdert maximaal 100 verlopen dossiers met documenten, jobs en audit per call. Roep opnieuw aan bij achterstand. Het Python-loopproces doet dit elk uur. Zonder een draaiend proces bestaat geen geplande fysieke verwijdering. Bestaande R2-testuploads van de oudere site moeten afzonderlijk worden geïnventariseerd/verwijderd; de nieuwe database migreert ze niet automatisch.

## Meta-funnel
Campagne → relevante kmo-boodschap → factuurupload → aangevraagde analyse → rapport/toelichting → concreet contract → expliciet akkoord → providerondertekening. Gebruik geen agressieve onbewijsbare besparingsclaims.
Voorbeeld advertentietekst: “Wat betaalt uw kmo echt voor energie? Laat uw energiefactuur bekijken en ontdek welke vragen, kosten en verbeteringen aandacht verdienen.” CTA: “Bekijk uw energiekosten”. Niet live inzetten vóór activering.
Pixel laadt uitsluitend na opt-in. Alleen PageView/Lead/Contact, geen klantgegevens, factuurtekst, bedragen, Advanced Matching of CAPI. Er is geen Meta-campagne aangemaakt. Gebruik UTM-campagnes voor landingslinks; UTM-attributie en specifieke sectorvarianten zijn nog niet opgeslagen/gepersonaliseerd. Houd patiënt-/werknemers-/andere gevoelige gegevens uit uploads en advertenties.

## Grenzen
Geen productiereedheid of wettelijke certificering. Geen aangesloten AI, CRM, SMTP, WhatsApp API, specialistkalender, marktprijzen of signingprovider. Kalenderaanvraag en upload werken wel en worden echt opgeslagen. Voorbeeld alleen testgegevens. Plan pen-test, opslag-/log-/backupinventaris en productie-acceptatietests vóór lancering.

## Postmark transactional receipts — 16 October 2026
Production secrets/configuration:
- POSTMARK_SERVER_TOKEN: secret Server API token, not Account API token.
- MAIL_FROM: one verified sender email address.
- MAIL_REPLY_TO: optional monitored reply address, defaults to MAIL_FROM.
- MAIL_NOTIFICATION_TO: one administrator notification address.
- EMAIL_ENABLED: set true only after the above settings and Postmark sender/domain verification are confirmed. Missing/false leaves the outbox queued.

Each newly stored request atomically queues one customer receipt and one administrator notification. Existing requests are not backfilled. The customer receipt contains the reference, no attachment or report access token. Admin notification contains the reference and authenticated /beheer link. No opening/click tracking. Provider ErrorCode=0 plus MessageID records accepted, not delivered. Delivery/bounce webhooks are not implemented in this first phase.

Dispatch runs after a new request and can be invoked by the authenticated owner at POST /api/admin/email (at most four messages per invocation). There is no scheduled queue processor yet. Rejected messages are failed. Provider rate limits leave a delayed queued item. Timeouts, interrupted sends and server errors require reconciliation rather than blind retry. A later activation may send queued requests, so review the queue and recipient before enabling. Do not activate with technical test addresses or obsolete requests present.
