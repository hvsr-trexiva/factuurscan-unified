# Klantprocessen en activatie

## Gebouwd

- Vergelijking -> `/overstappen?tariff=...` met aanvraag, lokale PDF-voorinvulling, aparte gegevens- en offertekeuzes, ondertekende opdracht-PDF, immutable scopehash, private ontvangstlink en intrekking.
- QR wordt lokaal gemaakt: alleen openbare aanvraag-URL en tarief-ID. Het is geen itsme-QR en draagt geen bestaand privé-dossier of persoonlijke invoer over.
- RFQ-wachtrij per gekozen leverancier. Geen automatische verzending aan de gehele markt. Alleen een uniek geverifieerd aanleverkanaal kan verzenden. Factuurbijlagen worden niet standaard doorgestuurd. De e-mail vraagt om de scherpste voorwaarden; er is geen autonome onderhandelaar die aanbiedingen accepteert of bindende afspraken maakt.
- Klantenservice met accountmanager-/terugbelverzoek, optionele externe agenda en WhatsApp-link.
- Digitale wegwijzer begroet lokaal na zes seconden; geen modelaanroep vóór een eigen bericht en expliciete chatverwerking. LLM-route kan na configuratie aan. Geen modeltoegang tot facturen, dossierdata of leveranciersaccounts.
- Voice AI-adapter voor EU Vapi. Alleen vooraf aangevraagde callbacks met aparte AI-keuze, eigenaarvrijgave, een werkdag 9-17u Brussel en maximaal30min na het gewenste tijdstip. Uitkomst accepted betekent provideracceptatie, geen gevoerd gesprek. Een onbekende uitkomst wordt niet blind herhaald.

## Runtime-configuratie die nog vereist is

- Bestaande Postmark en PandaDoc activering volgens `overstap-activatie.md`.
- `RFQ_ROUTES_JSON`: array van objecten `{supplier,recipient,acceptanceReference,acceptanceSha256,validUntil,enabled:true}`. supplier exact één van ENGIE, Luminus, TotalEnergies, Eneco, Energie.be, Ecofix. acceptanceSha256 is de SHA-256 van de bewaarde schriftelijke kanaalafspraak; datum ISO. Duplicaten blokkeren die leverancier. Geen namen of adressen raden. Voorbereide aanvragen kunnen na configuratie via `/beheer` worden ingepland; geen mail als EMAIL_ENABLED niet true is.
- `CHAT_ENABLED=true`, `OPENAI_API_KEY` als geheim, `CHAT_MODEL` als beschikbaar en beoordeeld model. Limiet20 vragen/IP/uur en500 modelaanroepen/dag totaal, maximaal6 berichten van1200 tekens en500 outputtokens. Configureer ook provider-budgetten. `store:false` is geen garantie van nul providerlogging of EU-datalocatie. Beoordeel DPA/transfer/regio vóór activering; er wordt geen EU-datalocatie voor OpenAI geclaimd.
- `VOICE_ENABLED=true`, `VAPI_API_KEY` als geheim van de EU-organisatie, `VAPI_ASSISTANT_ID`, `VAPI_PHONE_NUMBER_ID`, `VAPI_PRIVACY_APPROVED=true` pas na schriftelijke beoordeling van assistentgedrag, opname/transcriptie, onderaannemers, bewaartermijnen, verwerkersafspraken en exit naar menselijke opvolging. De adapter gebruikt uitsluitend `https://api.eu.vapi.ai/call`; Vapi EU vereist een daarvoor geschikte accountformule. Geen EU-account aangemaakt of kosten aangegaan.
- `WHATSAPP_NUMBER`: werkelijk toegekend zakelijk nummer in internationaal formaat zonder +. Dit activeert een click-to-chat-link, geen WhatsApp Business API, webhook of bemande livechat. Voor inkomende automatische chat en facturen is afzonderlijke Business-onboarding nodig.
- `BOOKING_URL`: geautoriseerde openbare agenda op calendly.com, calendar.app.google of calendar.google.com. Zonder agenda wordt een voorkeursmoment als aanvraag bewaard; geen verzonnen beschikbare slots of bevestigde afspraak.
- Het ondernemingsnummer en de wettelijke vertegenwoordiging van Factuurscan moeten vóór externe machtigingsindiening worden aangevuld/gecontroleerd.

## Officiële datatoegang en identificatie

- Fluvius: datatoegangscontract, OV/EV-certificaat, onboarding. Daarna de officiële shortURL -> Mijn Fluvius -> mandate Approved -> energy API-route. Concrete endpoints en certificaatbinding worden pas vanuit het toegekende contract geconfigureerd. Een ingevuld btw-nummer of eigen checkbox opent geen dataverbinding. Het nieuwe mandaat wordt niet stilzwijgend als Approved aangemerkt.
- itsme: partneronboarding, Client ID, diensten en cryptografische sleutelconfiguratie. Identificatie is niet hetzelfde als zakelijke vertegenwoordigingsbevoegdheid of algemene leveranciersmachtiging. Geen namaak-itsme-knop of QR-flow.
- Leveranciers: portaal- of API-toegang en aanleverafspraak per partij. Geen wachtwoorden, cookies of itsme-codes van klanten verzamelen. Een algemene opdracht maakt geen private leveranciers-API beschikbaar.
- Offertes en directe analyses: de bestaande volledige factuur/OCR-verwerker is nog niet als zelfstandige productiewerker aangesloten. Een menselijke of geautoriseerde externe verwerking bereidt gecontroleerde voorstellen voor. Het model in de chat voert geen factuuranalyse uit.

## Werking van queues

Er is geen zelfstandige periodieke runner aangesloten. RFQ-mail wordt direct geprobeerd na opslag als er een route en mailconfiguratie is. Retry429 wordt minstens60s uitgesteld en vereist daarna beheer/runner. Voice-callbacks worden via `/api/admin/voice` vrijgegeven door de eigenaar. Een productierunner voor deze eigenaarroute moet afzonderlijk worden ontworpen, met service-auth, planning, monitoring en intrekking; er is bewust geen openbare bel-trigger. Instellen van credentials alleen maakt deze runner niet actief.

## Keurmerken

Geen bewijs van EU- of Vlaamse overheidscertificering beschikbaar. Geen logo als erkenning gebruiken. Het Vlaamse logo vereist voorafgaande schriftelijke toestemming; EU/Commissie-logo mag geen niet-bestaande erkenning suggereren. Een eigen privacy- of beveiligingsicoon is geen certificaat.

## Verificatie

Lokale tests met fictieve gegevens en nagebootste providers controleren gegevensbereik, handtekeningmatch, PDF+SHA, replay-isolatie, private downloads, LLM toestemming/origin/configuratie, EU voice-endpoint, herkenbare AI-intro en onbekende resultaten. Echte productietests met provideraccounts en leveranciersacceptatie blijven vereist vóór activering. Browser-QA is in deze omgeving niet beschikbaar.
