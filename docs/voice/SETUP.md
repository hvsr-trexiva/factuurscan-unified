# Direct ElevenLabs + Twilio, onafhankelijk van Render

## Wat deze release uitvoert
- Voegt provider `elevenlabs` toe aan de bestaande duurzame voice_callback-wachtrij.
- Gebruikt ElevenLabs native Twilio outbound-call, met klantcontext per dossier als dynamic variables.
- Accepteert resultaten via `/api/integration/elevenlabs/webhook`, HMAC-SHA256 met tijdsvenster, agentcontrole, koppeling aan onze opgeslagen conversation_id en deduplicatie.
- Bewaart begrensd transcript, samenvatting, uitkomst en gespreksduur als te controleren `energy_input` in het bestaande CRM-dossier. Audio-webhooks worden niet opgeslagen.
- Een `do_not_call`-resultaat blokkeert AI, marketing en WhatsApp voor dat dossier en annuleert geplande terugbel- en sales-follow-upacties. De agent moet outcome correct configureren; modelherkenning is niet gegarandeerd en moet met bezwaar-tests worden gecontroleerd.
- Bestaande belvensters: ma-vr 09-17 Europe/Brussels; expliciete aiCall-toestemming en recent voorkeursmoment blijven vereist. Geen batchoproepen naar de bestaande CRM-database toegevoegd.
- Twilio recording staat in de oproepaanvraag uit. Controleer daarnaast ElevenLabs opname-/retentieinstellingen: dit is geen garantie dat ElevenLabs geen audio bewaart.

## Zelf beheren
Gebruik een door FactuurScan beheerde ElevenLabs-workspace, Twilio-account en betaalmethode. Geen nieuwe Render-service nodig voor deze connector. D1/R2 blijven de opslag van het huidige website-CRM; bestaande Render-data worden niet automatisch overgezet. Bewaar broncode en beheerrechten bij de onderneming.

## Configuratie in servergeheimen
VOICE_PROVIDER=elevenlabs
VOICE_ENABLED=true
ELEVENLABS_API_KEY=<scoped secret>
ELEVENLABS_AGENT_ID=<reviewed agent ID>
ELEVENLABS_PHONE_NUMBER_ID=<native Twilio integration number ID in ElevenLabs>
ELEVENLABS_WEBHOOK_SECRET=<webhook signing secret>
ELEVENLABS_PRIVACY_APPROVED=true

Maak een agent aan met `elevenlabs-agent-nl.txt`, de drie genoemde dynamic variables en het gestructureerde uitkomstveld `outcome`. Importeer een eigen verifieerbaar Belgisch/EEA nummer in de native Twilio-integratie. Gebruik geen verzonnen caller ID. Controleer daadwerkelijk nummerbeschikbaarheid, bedrijfsdocumenten, bestemmingsrechten en EEA-routering in het telefonieaccount.

Configureer transcription- en initiation-failure-webhooks op het bovengenoemde HTTPS-endpoint. Schakel providerretries in: een resultaat kan kort vóór de lokale opslag van het geaccepteerde conversation_id aankomen; dan antwoordt het endpoint 409. Geen audio-webhook nodig. Beveiligde resultaten kunnen nog na uitschakeling van VOICE_ENABLED binnenkomen; de webhook blijft ze verwerken zolang de authenticatie geldig is.

## Nog niet geleverd of geactiveerd
Geen providersleutels ingesteld, geen ElevenLabs-agent in een account aangemaakt, geen nummer gekocht en geen testoproep uitgevoerd. Er is geen zelfstandige geplande wachtrijrunner aangesloten. Het bestaande sales-runner kan dispatchVoice uitvoeren, maar requires een betrouwbaar geplande trigger. Geen huidige provideracceptatie of spraak-/conversiekwaliteit geverifieerd.

De volgende release moet bewijs van toestemming uit de warme database importeren, ontvangers dedupliceren, bezwaren over alle klantdossiers synchroniseren en kanaalrechten afzonderlijk controleren. De oude toestemming is hier niet ingezien of juridisch gevalideerd. Oproepautorisatie in deze connector blijft gebaseerd op bestaande expliciete AI-terugbelverzoeken.

Nog toe te voegen: live tools met dossiergebonden autorisatie voor factuurlink, afgesproken callback, gecontroleerde offerte en digitale ondertekenlink; Postmark/WhatsApp-afleverstatus; automatische stop na antwoord/ondertekening; strikt campagnebudget en maximumduur in providerinstellingen; kosten-/conversierapportage; productie-end-to-endtest. De agent mag tot die tijd niet beweren dat deze acties beschikbaar zijn. approvedOffer blijft bewust null: deze release koppelt nog geen versiegebonden gecontroleerde tariefberekening aan de agent.

## Acceptatietest
Eerst eigen testnummer en synthetisch dossier. Test Vlaams accent, onderbreken, stilte, voicemail, afkortingen, EAN-cijfers, fout nummer, bezwaar, afmelden, verzoek tot mens, netwerk-timeout en dubbele webhook. Controleer transcript → juiste dossier, geen dubbele oproep na ambigu resultaat, stop op bezwaar en geen ongeautoriseerde prijsclaims. Kies stem/taalmodel op deze meetbare testen, niet alleen op demo-audio.
