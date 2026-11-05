# Eén Vlaamse energie-overstapketen

## Keuze en systeem van waarheid

FactuurScan CRM in Sites blijft het centrale dossier: Cloudflare D1 voor requests, jobs, workflows, audit, email_outbox, actions en artifacts; R2 voor facturen, oorspronkelijke PDF's, voorbereide versies, getekende documenten en bewijs-JSON. De zichtbare beheerplek is /sales, tab Energiedossiers; /beheer behoudt geavanceerde dossierfuncties. Geen nieuwe database of HubSpot-account aangemaakt. De huidige Render-database, API en ElevenLabs-agent zijn niet toegankelijk/geverifieerd in deze uitvoering. Daarom is geen migratie van Render-klanten uitgevoerd. Een Render-worker leest/schrijft het centrale dossier via geauthenticeerde API's, zonder een tweede leidende klantadministratie.

## Eerst overstappen, mandaten optioneel

1. Klant laadt een eindafrekening op. Tekst-PDF-herkenning stelt alleen expliciet gelabelde waarden voor. Beeld-OCR moet nog op een provider worden aangesloten. Een EAN zonder herkenbaar energietype wordt niet automatisch als elektriciteit gelabeld.
2. Klant bevestigt de gegevens en dient de vergelijking/overstapaanvraag in zonder verplicht mandaat. Verbruiksprofiel, bedrijfsnummer en aansluitingen worden ook zonder gegevensmachtiging opgeslagen. Publieke invoer mag geen leveranciersbevestiging of bevestigde startdatum registreren.
3. De rekenlaag/worker berekent hetzelfde verbruik, periode en kostenbasis voor huidig en nieuw contract. EAN, btw, leverancier, product, prijsbasis en startdatum moeten voor vrijgave kloppen. Bij variabel/dynamisch blijven ramingen en historische profielsimulaties onderscheiden.
4. De operator voegt de leverancierseigen contract-PDF, tariefkaart en voorwaarden toe. Bijlagen eerst toevoegen: hun IDs en SHA-256 worden daarna aan de contractversie gebonden. Upload is geen contractvrijgave. Bestaand actief contract in de andere signingroute blokkeert een tweede traject.
5. Per document kiest de klant afzonderlijk akkoord en ondertekening. Optionele documenten worden niet als voorwaarde voor een rechtstreeks leverancierscontract opgelegd.
6. Getekende leveranciers-PDF en gebonden bijlagen worden pas naar een vooraf geverifieerde ontvanger gestuurd als alle bijlagen afzonderlijk getekend zijn, het profiel overeenkomt en schriftelijke acceptatie voor de exacte PDF/methode aanwezig is. Verzendacceptatie is geen leveranciersacceptatie of actieve levering.
7. Registreer de leveranciersbevestiging en daadwerkelijke startdatum apart. Geen gewone opzeggingsmail naar de oude leverancier bij een standaardwissel: de nieuwe leverancier regelt die doorgaans. Voor grotere zakelijke aansluitingen eerst toepasselijke contractvoorwaarden en procedure bevestigen. Geen generieke aanvraag naar Fluvius zonder officiële route.

## Energiedossier

payload.energy bevat versiegewijze gegevens: bedrijfs-/btw-nummer, functie ondertekenaar, facturatieadres; maximaal tien vestigingen met aparte elektriciteits- en gas-EAN, adres, postcode, klant-/meternummer, meter (digitaal/analoog/AMR), register, kWh dag/nacht/exclusief nacht/totaal/gas/injectie, maandpiek kW, zonnepanelen kWp, batterij kWh, laadpaal, warmtepomp, huidig product/leverancier/tarieftype, contracteinde en verbruiksperiode. Nieuw product/leverancier/vast-variabel-dynamisch, gewenste start, bevestigde start plus bewijsreferentie, jaarkosten, prijsbasis, geldigheid en upsellinteresse zijn apart. Upsell is geen bestelling of marketingopt-in. Interne notities, upsellinteresse en achteraf bevestigde startinformatie staan los van de contractversie. De contractprofielversie en hash beschermen tegen stille wijzigingen tijdens tekenen of verzenden.

Btw/EAN-controlecijfer is een formaatcontrole, geen bewijs van eigendom of bevoegdheid. Btw alleen ontsluit geen EAN/verbruiksgegevens. KBO-onboarding en Fluvius-datatoegang blijven afzonderlijk. Excel/CSV-import ondersteunt aparte EAN- en kWh-kolommen; EANs in Excel moeten tekst zijn, nooit afgeronde getallen. Export /api/admin/energy/export is alleen voor de eigenaar en beperkt tot 5.000 actieve dossiers.

## Drie verschillende overeenkomsten

- service_agreement: eigen beperkte begeleidingsopdracht. Kosteloos vergelijken en administratief opvolgen, geen energiecontract en geen algemene bevoegdheid om zonder gekozen aanbod te wisselen. Eenvoudige afzonderlijke klikverklaring met bevestigde naam, bevoegdheidsverklaring, documenthash, serverdatum, beschikbare edge-IP en user-agent. De privélink bewijst op zichzelf geen onafhankelijk gecontroleerde identiteit. Werktekst moet voor definitieve bedrijfsvoering op de echte rechtspersoon en handelsvoorwaarden worden afgestemd.
- supplier_contract: origineel leverancierscontract, via PandaDoc PDF-upload. Voor de consument/zakelijke klant is dit de primaire directe contractroute. Niet vervangen door een eigen FactuurScan-PDF zonder leveranciersaanvaarding.
- switch_mandate/data_mandate: optionele aparte documenten. Beperkt doel, aansluitingen, gekozen aanbod/periode en intrekking. Geen onbeperkte toekomstige wissels of betalingen. Providerondertekening en ontvangeracceptatie blijven nodig. Het generieke gegevensmandaat is geen automatisch goedgekeurd Fluvius-mandaat. Deze documenten worden niet automatisch extern verstuurd; alleen het ondertekende leverancierstraject heeft een geactiveerde mailroute.

## PDF-invulling en handtekeningen

Origineel wordt ongewijzigd gearchiveerd. SUPPLIER_PDF_FIELD_MAPS_JSON bevat vooraf gecontroleerde mappings, uitsluitend voor een exacte oorspronkelijke template-SHA-256. Per mapping: templateSha256, version, fields:[{pdfField,source}]. source is alleen een toegestaan CRM-veld, bijvoorbeeld company, companyNumber, name, email, desiredStart of sites.0.electricityEan. Ontbrekende benodigde waarden of onjuiste native PDF-veldnamen blokkeren invulling. Er worden geen statische coördinaten of leveranciersvelden geraden. Als er geen mapping is, blijft de oorspronkelijke PDF intact en staan gegevens op een afzonderlijke appendix; de leverancier moet dat expliciet accepteren.

Voor de ondertekenversie wordt een aparte pagina toegevoegd met partijen, EANs, gekozen product, kostenbasis, gewenste start, bestand-/profielhashes, bijlagemanifest en PandaDoc-fieldtag. Elk document krijgt een eigen providerdocument-ID. Native PDF-bestaande ondertekeningen mogen niet worden hergebruikt of gewijzigd: alleen ongetekende bron-PDF's uploaden. De laatste provider-PDF wordt beschermd gedownload en samen met providerdetails gearchiveerd. signedAt voor providerstukken is de serverbevestiging van voltooide ondertekening, niet een onafhankelijk vastgestelde exacte tijd van de menselijke tekenhandeling. De providerdetails blijven het primaire aanvullende bewijs.

Een IP-adres of muisklik is geen gekwalificeerde elektronische handtekening. Leveranciers bepalen welke methode en identificatie zij voor hun contract aanvaarden. Een account/API-proef met echte templates en partijen is nog nodig. Er zijn geen echte contracten verstuurd of ondertekend in deze uitvoering.

ENERGY_DOCUMENT_ROUTES_JSON: [{supplier,product,kind,sourceSha256,preparedSha256,recipient,method:"pandadoc_pdf_appendix",acceptanceReference,acceptanceSha256,validUntil,enabled:true}]. Voor automatisering van een identiek leverancierssjabloon kan preparedSha256 vervangen worden door acceptPersonalisation:true, mappingVersion (of appendix_only) en appendixVersion. De schriftelijke acceptatie moet die invulmapping en appendix expliciet dekken; sourceSha256 blijft de exacte goedgekeurde bron-templatehash. De individuele voorbereide/getekende hashes blijven per dossier gecontroleerd en bewaard. Eén unieke geldige match is vereist. De operator moet de schriftelijke acceptatie zelf hebben opgeslagen; een ingevulde referentie is geen door FactuurScan geverifieerde externe overeenkomst. De fingerprint wordt bij aanmaak bevroren en bij verzending opnieuw gecontroleerd. Voor supplier_contract en switch_mandate vereist vrijgave een compleet aantoonbaar voordeliger profiel, datum, functie, btw en EAN. Verwerking van een afgewezen/verlopen of onbekend providerresultaat vraagt controle, geen blind opnieuw verzenden.

## Bestaande Render-/ElevenLabs-agent behouden

Geen nieuw login of nieuwe agent aangemaakt. Zet VOICE_PROVIDER=render pas na aansluiting. De bestaande Vapi-route blijft standaard behouden maar is zonder credentials niet actief.

Benodigde secrets/configuratie: RENDER_VOICE_URL (exact HTTPS outbound-endpoint op de eigen onrender.com-host, geen geraden pad), RENDER_VOICE_TOKEN, RENDER_VOICE_ENABLED=true en RENDER_VOICE_PRIVACY_APPROVED=true. Uitgaand verzoek met Bearer-auth en Idempotency-Key voice:<requestId>: {requestId,reference,phone,purpose:"requested_energy_callback",aiCallConsent:true,resultEndpoint}. Adapter antwoordt {callId}. Dit callId moet exact hetzelfde zijn in de resultaatterugmelding. 429 wordt later geprobeerd; onbekende netwerk/serveruitkomst wordt niet blind herhaald. Belgische belvensters en bestaande opt-in blijven gelden.

Een agent mag context ophalen via GET /api/platform/energy?id=<id> met PLATFORM_TOKEN. Dit vereist actieve AI-beltoestemming en ongepauzeerde opdracht. Verstuur PLATFORM_TOKEN alleen server-to-server. Een verzoek om een ander dossier of een ingetrokken AI-toestemming wordt geweigerd.

Render moet de eigen ElevenLabs-post-call-webhook verifiëren met de officiële SDK construct_event(rawBody=...,sig_header=...,secret=...) inclusief tijdstempelcontrole. Daarna normaliseren naar POST /api/platform/voice-result, Authorization Bearer PLATFORM_TOKEN: {eventId,requestId,callId,outcome,summary,suggestions}. outcome: completed/no_answer/failed/callback_requested/do_not_call. Alleen reeds bij dit dossier geregistreerde callIds worden aanvaard. do_not_call zet AI-beltoestemming uit en annuleert wachtende oproepen. Volledige audio/transcripten worden via deze route niet opgeslagen; afzonderlijke opname/transcriptie-instellingen en toestemming eerst vaststellen.

Als ElevenLabs uitsluitend TTS levert en geen ElevenAgents-sessies beheert, moet de bestaande Render-callcontroller de gespreksuitkomst leveren; een ElevenAgents-post-call-webhook mag dan niet worden verondersteld. De bestaande configuratie is daarvoor nog niet ingezien.

## E-mail, OCR en bronvoorstellen

POST /api/platform/energy-events met PLATFORM_TOKEN accepteert strikt gevalideerde voorstellen van email/voice/ocr/fluvius/kbo. eventId,requestId,channel,externalId,summary,occurredAt,suggestions:[{field,value,evidence}]. Een voorstel kan geen opt-ins, autorisaties of contractstatus aanpassen. Beheerder kan de voorstellen in het profiel laden, controleren en expliciet opslaan. Er is geen onbeperkte AI-schrijftoegang tot bevestigde contractvelden.

POST /api/postmark/inbound met x-fs-inbound-secret gelijk INBOUND_EMAIL_WEBHOOK_SECRET koppelt een bericht alleen wanneer exact één actieve referentie én afzenderadres overeenkomen. De mailinhoud is onbetrouwbare klantinvoer, geen identiteitsbewijs of opdracht voor systeemacties. Bewaart een beperkte tekstsamenvatting/excerpt en expliciete gelabelde veldsuggesties; geen bijlagen of ruwe mailboxdump. Niet gekoppelde berichten worden niet in dossiers opgeslagen. Mailbijlagen moeten via de geauthenticeerde bestaande upload/OCR-adapter worden aangeleverd. SPF/DKIM/DMARC en ontvangercontrole horen bij de mailboxadapter. Postmark inkomend/uitgaand zijn nog niet geactiveerd.

## Nog te leveren / aan te maken

1. Echt ondernemingsnummer, rechtspersoon en verantwoordelijke van FactuurScan; eigen opdrachtovereenkomst afstemmen.
2. Per eerste leverancier: broker-/commissieafspraak, echte PDF + tariefkaart + voorwaarden, veldmapping, toegelaten e-signmethode, aanvaard mandaat ja/nee, geverifieerd aanleveradres/API en ontvangst-/startbevestiging.
3. Bestaand PandaDoc-account of account aanmaken indien ontbreekt: API-toegang, webhook, providerproef; contracten nooit naar leveranciers sturen tijdens tests.
4. Bestaande Postmark of mailprovider: afzenderverificatie, uitgaande events, inkomende mailbox, secrets, proef naar eigen testadres.
5. Render-repository/API-documentatie, endpoint, eigenaarstoegang, ElevenLabs-agent-/voice-ID, telefonieprovider/nummer, post-call-events en instellingen voor regio/bewaring/opname. Geen nieuw abonnement nodig besluiten voordat bestaande mogelijkheden zijn gecontroleerd.
6. OCR-provider en analyseworker koppelen. Alleen tekst-PDF-voorstellen zijn nu direct beschikbaar. Geavanceerde factuurherkenning blijft providerwerk.
7. Beveiligde scheduler, monitor en foutenwachtrij activeren; één echte proef van upload tot aanvaarde contractstart met de eerste leverancier.
8. Fluvius-datatoegangscontract, certificaten/onboarding en mandaatroute; dit is optioneel voor de eerste factuurgebaseerde overstappen. KBO-serviceaccount voor de bestaande KBO-adapter als bedrijfsverrijking gewenst is.

Beveiligingsmaatregelen zijn geen bewijs van volledige AVG-conformiteit of EU-datalocatie. Provider-DPA, feitelijke regio, toegangsbeheer, bewaartermijnen en herstel/back-ups controleren voor live verwerking. Ondertekende case-documenten blijven voor de eigenaar zichtbaar na het verlopen van de klantlink en blokkeren automatische dossierverwijdering totdat bewaarbeoordeling is uitgevoerd; verouderde dossierlinks blijven verlopen.
