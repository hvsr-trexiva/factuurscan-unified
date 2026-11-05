# Resultaatgerichte overstapflow

Na de eerste vergelijking toont de linkerzijbalk geen verbruiksvragen meer. Het gasformulier bestaat eenmaal, ingeklapt in die zijbalk. Het resultatenpaneel toont één gezamenlijk overzicht; de afzonderlijke tariefkaarten zijn openklapbare details. De berekening en de gewogen totaalbesparing zijn behouden.

## Klantreis

- `/energie-vergelijken`: leverancier, volumes, budget en contact → resultaat → dezelfde privé-overstapflow.
- `/overstap-afronden#id:private-token`: dossier, factuur/foto, bevestigen of handmatig aanvullen.
- `/aanleveren#id:private-token`: bestaande e-maillinks openen dezelfde flow; afmelden behoudt de bestaande stopfunctie.
- `/telefoon#id:upload-token`: telefoonupload met een apart token, 30 minuten geldig. Alleen uploaden en ontvangst controleren; geen klantprofiel of dossierdownload. Een nieuwe QR-code trekt de vorige uploadlink in.
- Hoofdformulier en bestaande overstapaanvraag gebruiken na ontvangst ook de serverextractor. De originele documenten blijven bewaard als extractie mislukt.

De grote keuze ‘Gegevens inspreken’ opent handmatige aanvulling met dicteerknoppen bij ondersteunde velden. De opnameknoppen verschijnen uitsluitend bij browserondersteuning; anders verschijnt een duidelijke uitleg. De gebruiker start elke opname zelf en ziet het doelveld. Browserdienstverwerking kan extern gebeuren; daarvoor staat een toelichting bij de functie. Geen automatische campagne of uitgaande oproep ontstaat door deze flow.

## Documentlezing en controle

Tekst-PDF's worden op de server met unpdf gelezen. Alleen ondersteunde klantlabels en geldige btw-/EAN-controlecijfers leveren suggesties op. Gerapporteerd periodeverbruik wordt niet als jaarafname geëxtrapoleerd. Niet-eenduidige of ontbrekende gegevens vragen bevestiging. Bewijs en waarschuwingen staan bij de extracties. Klantcorrecties worden niet stil overschreven.

Voor scans/foto's en onvolledige tekstherkenning bestaat een afgeschermde, begrensde vision-adapter. Nodig: OPENAI_API_KEY en INVOICE_OCR_MODEL in de beveiligde runtime-instellingen. Geen standaardmodel of API-sleutel verzonnen. De provider krijgt store=false, een strict JSON-schema, een instructie om documentinstructies te negeren, maximaal 4500 outputtokens en een time-out. Zonder configuratie blijft de upload bruikbaar; de interface vermeldt eerlijk dat handmatige aanvulling nodig is.

## Meerdere bedrijven en locaties

Tot 10 ondernemingen en 10 locaties per dossier. Elke locatie behoort aan één onderneming. Een onderneming heeft een centraal facturatieadres; elke locatie kan daarvan afwijken. Dezelfde EAN komt niet tweemaal voor. Btw-nummers en EAN's worden gevalideerd. De CRM-payload bevat checkoutProfile en energyPortfolios; de bestaande enkelvoudige energievelden spiegelen het eerste bedrijf. Dit maakt geen automatisch geaccepteerd gezamenlijk leverancierscontract voor verschillende rechtspersonen. Contracten moeten per juiste rechtspersoon, aansluitingsscope en tekenbevoegde worden vrijgegeven.

## Bevestiging versus leverancierscontract

De online opdracht tot overstapvoorbereiding bewaart profielversie, voorwaardenversie/hash, tijdstip, gehashte IP-verwijzing, browserkenmerk, naam en verklaarde bevoegdheid. Een PDF en documenthash worden privé gearchiveerd. Dit is een eenvoudige elektronische verklaring, geen onafhankelijk geverifieerde identiteit of gekwalificeerde handtekening. Zij sluit geen energiecontract af.

Werkelijke leveranciersondertekening gebruikt de bestaande PandaDoc-routes, providercontrole, individuele documenten/bijlagen en archiefbewijzen. De embedded component krijgt nu ook expliciete privétoegang mee als zij op de vergelijkingspagina staat. Nodig voor activering: werkelijk COMPANY_NUMBER, PANDADOC_API_KEY, PANDADOC_WEBHOOK_SECRET en geldige SUPPLIER_ROUTES_JSON / ENERGY_DOCUMENT_ROUTES_JSON met goedgekeurde leveranciersdocumenten en schriftelijk aanvaarde aanlevering. Geen lege of fictieve leveranciercontracten als testcontracten activeren. Voorstellen zonder begonnen ondertekening worden bij gewijzigd profiel gepauzeerd voor hercontrole.

## Voorstel en e-mail

De persoonlijke PDF rekent alleen de verbruiksafhankelijke energie, met dezelfde eigen oktobertabel. Meerdere locaties worden apart berekend en opgeteld. Dynamische klantcontracten vragen profielcontrole. Als factuurgegevens geen jaarverbruik opleveren, blijft een bestaand invoerscenario expliciet een scenario. Een onbekende prijs wordt geen nulbesparing.

Na factuurontvangst wordt bij de bestaande afzonderlijke e-mailvoorstelkeuze één versie van het voorstel met PDF klaargezet. Een herhaalde upload met dezelfde SHA-256 wordt geen tweede document. De e-mail gebruikt een bevroren berekening en PDF met hashcontrole. Reeds aanvaarde e-mails worden niet opnieuw verstuurd; oude nog niet verzonden voorstelversies worden geannuleerd. Afleverstatus blijft apart van provideracceptatie. Een expliciete knop kan hetzelfde voorstel opnieuw laten verwerken, maar herhaalt een aanvaarde versie niet.

Deze website had tijdens inspectie EMAIL_ENABLED=false en geen POSTMARK_SERVER_TOKEN-vermelding. Voor een echte test: stel de bestaande Postmark Server Token veilig in, met geverifieerde MAIL_FROM, MAIL_REPLY_TO, MAIL_NOTIFICATION_TO en EMAIL_ENABLED=true. Publiceer die runtimewijziging. Test daarna met het eigen gecontroleerde adres technical@factuurscan.be of admin@factuurscan.be; nooit met een fictief klantenadres of een adres uit een leveranciersfooter. De code leest geen Render-sleutels uit en openbaart geen secrets. De afzonderlijke Renderomgeving wordt niet door deze websitepublicatie gewijzigd.

## Tijdelijk WhatsApp

WHATSAPP_NUMBER=355696819209 is ingesteld. De wa.me-link opent een rechtstreeks gesprek; de klant voegt zelf een bijlage toe. Zonder WhatsApp Business API/webhook wordt een chatbijlage niet automatisch aan dit CRM gekoppeld. De interface noemt dit onderscheid. Vervang deze runtimewaarde door het Belgische nummer zodra beschikbaar; er is geen API nodig om de chatlink te gebruiken.

## Verificatie

`node scripts/test-checkout.cjs`, `node scripts/test-offer-funnel.cjs`, `node scripts/test-switching.cjs`, `node scripts/test-october-pricing.cjs`, `node scripts/test-mail.cjs`, TypeScript en productiebuild. Nieuwe tests behandelen twee rechtspersonen, afwijkende facturatie, EAN-duplicaten, bewaarde opdracht/PDF, echte PDF-tekstextractie, beperkte/verlopen QR-tokens, beeldopslag zonder OCR, privétoegang, versienummerconflicten en idempotente voorstelmail met PDF via gemockte Postmark-provider. Geen echte testmail, leveranciersaanvraag of betaalde OCR-oproep zonder geconfigureerde provider. De gegenereerde voorstel-PDF is gerenderd en visueel gecontroleerd. Interactieve browsercontrole is nog niet uitgevoerd.


## Machtigingsformulier en gegevensdeling — 21 oktober 2026

De aparte gegevensmachtiging geeft nu alle validatiefouten met veldnaam terug via de API, toont ze naast het veld en in een aanklikbaar overzicht, en focust het eerste foutieve veld. Ondernemings- en EAN-controlecijfers blijven verplicht. De ondertekening vermeldt bij een afwijking de volledige naam die verwacht wordt. De klant kan die naam uitdrukkelijk overnemen zonder daarmee al te ondertekenen. EAN-lijsten accepteren lege regels en komma-/puntkommascheiding in het formulier. Onmogelijke datums, meer dan drie jaar historie, dubbele EAN’s, ontbrekende categorie en ontbrekende toestemmingen blijven geblokkeerd. De chat opent niet meer over dit formulier.

Op de homepage, in de overstapflow en bij gegevensdeling staan grote keuzes voor de gegevensmachtiging, Mijn Fluvius en de officiële factuur-/klantenzonepagina’s van ENGIE, Luminus, Eneco en TotalEnergies. Portalen openen in een afzonderlijk tabblad; de gebruiker downloadt de PDF en uploadt die zelf. itsme op Mijn Fluvius verleent FactuurScan geen data- of identiteitskoppeling. Rechtstreekse itsme-integratie vraagt bedrijfs-onboarding, een toegewezen client/service, sleutelregistratie en geregistreerde redirect-URI’s. Er is geen fictieve itsme-login gepubliceerd.

MAIL_FROM en MAIL_REPLY_TO zijn ingesteld op technical@factuurscan.be. EMAIL_ENABLED blijft false zolang de eigenlijke POSTMARK_SERVER_TOKEN ontbreekt. Ook MAIL_NOTIFICATION_TO moet een geldig gecontroleerd adres bevatten. Veilige activering: token handmatig als secret in de runtime-instellingen invoeren, afzender/domein in Postmark bevestigen, meldingsadres controleren, EMAIL_ENABLED=true en publiceren. Daarna één voorstel met fictieve klantgegevens naar technical@factuurscan.be verzenden en afzonderlijk provideracceptatie en aflevering controleren. Geen sleutels in chat of broncode.

Uitgebreide automatische controle omvat alle bestaande scripts/test-*.cjs. Oudere testloaders zijn bijgewerkt voor de eigen JSON-maandcatalogus; testaanvragen gebruiken een daadwerkelijk vrijgegeven eigen leverancier. De mandate-tests controleren nu ook veldpaden, Nederlandse foutmeldingen en EAN-lijstnormalisatie. Eerste browserweergave van het gewijzigde formulier lukte; verdere browserinteractie werd geblokkeerd door de URL-beveiliging van de browser. Volledige interactieve browser-, microfoon-, echte providerlogin- en echte mailafleveringstests zijn daardoor niet voltooid. Een geslaagde gesimuleerde providertest is geen live aflevering.


## Eén beste voorstel en gegevensopvolging

De klantweergave toont één samengesteld voorstel, met per energietype het eerste (voordeligste passende) resultaat van hetzelfde eigen maandmodel. Andere aanbodkaarten zijn verwijderd. De server weigert selectie van een duurder alternatief via de publieke keuzeroute. Elektriciteit en gas houden hun onafhankelijke berekening, met één gewogen totaal. Een bestaande vaste-contractvoorkeur in het rekenmodel blijft van toepassing. De knop onder de besparing bewaart de aanbevolen keuze en opent de upload/handmatige stap.

Ontvangstvoorstel en factuurvoorstel gebruiken dezelfde HTML-mailopbouw: totaalverschil, referentie en aanbod naast elkaar, directe knop, onderdelen van één voorstel en contractstap in hetzelfde privédossier. Geen werkelijke leveranciercontracten bijgevoegd of vrijgegeven zonder gecontroleerde documentroute. De voorstel-PDF bevat een werkelijke Link/URI-annotatie op de groene knop. Download en e-mail openen hetzelfde privé-overstapdossier. Het afzonderlijke dossier toont opnieuw het voorstel en de contractsectie; bij een vrijgegeven contract leidt de primaire knop naar ondertekening. Geen upload, gegevensbevestiging of hulpvraag sluit op zichzelf een energiecontract af.

De handmatige route heeft een KBO-keuzecomponent: ondernemingsnummer opzoeken via de bestaande afgeschermde officiële serviceadapter, gevonden onderneming kiezen, naam/nummer en beschikbaar adres overnemen. Een bestaand facturatieadres blijft behouden; een zeteladres wordt niet als leveringsadres aangenomen. Er is geen naamzoekservice of verzonnen suggestiedatabase. KBO_USERNAME/KBO_PASSWORD ontbreken nog in deze Site-configuratie; zonder die activatie werkt de handmatige route en kan opvolging worden gevraagd.

POST /api/energy-help bewaart een expliciete hulpvraag: factuur, bedrijfsgegevens, EAN, Fluvius of overige aanvraag. Binnen een privé-dossier blijft dezelfde dossier-ID behouden; bekende contactgegevens hoeven niet opnieuw ingevuld te worden. Zonder dossier zijn e-mail, telefoon en expliciete contactaanvraag voldoende. De keuze voor menselijke telefonische opvolging staat los van AI- of marketingtoestemming. Een idempotente CRM-taak en het verzoek verschijnen in de saleswerkvoorraad en het dossierpaneel. Er wordt geen externe Fluvius-/leveranciersaanvraag verstuurd. Deze taken vragen menselijke afhandeling zolang de provider- en schedulerkoppelingen ontbreken.

Gegevenshulp is beschikbaar op de hoofdpagina, naast de eerste vergelijkingsstap en vanuit de contact-, bedrijfs- en EAN-stappen van het privé-dossier. Onvolledige gegevens zijn geen reden om een EAN of een bedrijf te verzinnen. De aanvraag kan bewaard en opgevolgd worden; het werkelijke contract vraagt nog steeds de verplichte gecontroleerde gegevens.

Navigatie toont Hoofdpagina, Terug naar mijn voorstel en Mijn dossier. Bij de hoofdlink uit een gewijzigd checkoutprofiel worden eerst de geldige wijzigingen opgeslagen. Een mislukte bewaarpoging houdt de gebruiker op het formulier. Rustige zandkleurige hulpblokken, olijfgroene keuzes en groene voordeelknoppen geven de verschillende stappen een eigen accent; foutmeldingen blijven herkenbaar.

Verificatie: tests met echte PDF-tekstextractie en een klikbare PDF-annotatie, private en publieke hulpvragen, herhaling zonder extra dossier of taak, afwijzing van ongeldige toegang/toestemming, geen verzonnen providergoedkeuring, alleen beste aanbod in HTML-mail, exacte gewogen totaalbedragen en bestaande contractguards. PDF visueel gerenderd en gecontroleerd. Volledige browsertest blijft niet uitvoerbaar door de eerder gemelde browserbeveiliging. Geen echte provideroproepen of mails zonder de ontbrekende configuratie.
