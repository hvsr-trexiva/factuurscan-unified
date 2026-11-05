# Vereenvoudigde energieaanvraag

De openbare module begint met vier aanklikbare huidige leveranciers (ENGIE, Luminus, Eneco, TotalEnergies). Elektriciteit staat standaard aan; gas is afzonderlijk selecteerbaar. Per energietype kiest de bezoeker een jaarverbruiksband en maandvoorschotband of vult exacte waarden in. Bij onbekend contracttype wordt variabel aangenomen wanneer geen vast eigen aanbod bestaat. Bij een bekend vast contract krijgt een beschikbaar vast eigen aanbod voorrang; anders tonen we het variabele aanbod met expliciet verschillend contracttype. Alleen e-mail en telefoon zijn vereist in de eerste contactstap; naam en extra vinkjes worden daar niet gevraagd. De verzendknop en begeleidende informatie beschrijven het aangevraagde e-mailvoorstel. Er wordt hierdoor geen bel-, herinnerings- of marketingtoestemming aangezet. Er zijn geen invoervelden voor jaarlijkse leverancierskosten, netkosten, heffingen of btw. Prijsverschillen komen uitsluitend uit de vrijgegeven eigen maandcatalogus bij hetzelfde jaarverbruik. Het voorschot is budgetinformatie en wordt niet zonder kostendekking als bewijs van een totale factuurbesparing gebruikt.

Contactgegevens worden pas opgeslagen na het bewust verzenden van de aanvraag; de privacyinformatie staat bij die knop. E-mailvoorstel, één herinnering, medewerkercontact en AI-gesprek zijn afzonderlijke keuzes. Er is geen vastlegging van oningediende toetsenaanslagen.

`POST /api/offer-lead` berekent server-side, legt dossier en toestemmingen vast, gebruikt een gehashte privétoegang en een versleutelde vervolglink, en hergebruikt dezelfde aanvraag bij retries. De klant kan een tarief selecteren en de factuur op dezelfde pagina toevoegen. De bestaande analyse- en ondertekenroutes blijven leidend; een aanvraagvinkje is geen leveranciershandtekening.

Het e-mailvoorstel heeft tekst en HTML. Provideracceptatie is niet hetzelfde als aflevering. Zonder vrijgegeven prijzen bevat de mail uitsluitend een aanvraagbevestiging en uploadlink; er worden geen tarieven of contracten verzonnen.

Na vijf minuten zonder geregistreerde activiteit kan de bestaande sales-runner één herstelmail en/of één AI-terugbelactie klaarzetten, uitsluitend bij de betreffende opt-ins. De runner moet extern periodiek `/api/platform/sales-run` met de bestaande platformautorisatie aanroepen. Een gesloten browser start zelf geen achtergrondwerker. Een aangevraagd medewerkercontact staat als `human_callback` in de actielijst. De AI-provider behoudt de ingestelde beluren en configuratiecontroles. Factuurupload en intrekking annuleren onnodige vervolgacties.

Voor live gebruik nog aantoonbaar te activeren/controleren: maandelijkse vernieuwing van de eigen tarieven, Postmark-configuratie op deze website, periodieke runner, voiceprovider/telefoon en privacyconfiguratie, analysewerker, leverancierscontracten en geaccepteerde onderteken-/aanleverroutes. Deze wijziging zet die kanalen niet stilzwijgend aan.

Controle: `node scripts/test-offer-funnel.cjs`, `node scripts/test-sales.cjs`, `node scripts/test-mail.cjs`, `node scripts/test-business-compare.cjs`, TypeScript en de frameworkproductiebouw. Tests gebruiken synthetische data en sturen geen echte berichten of gesprekken.

## Afzonderlijke energieberekeningen en bandkeuzes

Beide energietypes krijgen een eigen vergelijkingssnapshot, eigen aanbodkeuzes en een apart euro-/procentresultaat in scherm en e-mail. De server controleert dat een opgegeven band exact overeenkomt met het gepubliceerde representatieve rekenvolume of voorschot. Bandwaarden zijn expliciete scenario-aannames en geen vastgestelde klantafname. Elektriciteit wordt eerst getoond. Bij ontbrekende tarieven wordt geen bedrag verzonnen; de oorspronkelijke lange melding over maandprijsvrijgave is verwijderd.

## Oktober 2026: aangeleverde Excel als enige prijsbron

De klant heeft op 21 oktober 2026 expliciet het bestand `data/sources/KMO_energievergelijking_oktober_2026.xlsx` aangewezen. De SHA-256 van het oorspronkelijke bestand staat in de catalogus. Rijen 8–23 zijn referenties (hoogste enkelvoudige basisprijs per leverancier en type), rijen 24–27 zijn eigen aanbiedingen OCTA+ Boost Flex en Energy Together Evident Flexi Pro. Dynamische producten zijn uitgesloten: er zijn geen intervalgegevens. Er zijn geen vaste eigen producten aangeleverd. Alle vier leveranciers en beide energietypes blijven afzonderlijk.

`calculationBasis: energy_only` selecteert uitsluitend de basisenergieprijs E (c€/kWh), zonder GSC/WKK, vaste vergoedingen, netkosten, heffingen, btw of kortingen. Deze uitgesloten bronwaarden blijven als metadata bewaard. Jaarenergie = kWh × E / 100; besparing = jaarenergie referentie − jaarenergie aanbod; percentage = (1 − aanbod E / referentie E) × 100. De bekende maandvoorschotten worden × 12 als budgetreferentie getoond, niet met het energiepercentage afgeprijsd. De module noemt het gekozen dure product als tabelreferentie, nooit als bewezen huidig klantcontract. Het aanbod toont variabele jaarprijsramingen als estimatie. Het maandgeldigheidsfilter blijft actief; oktoberprijzen worden niet stilzwijgend als novemberprijzen hergebruikt.

Geen kunstmatige timer, winstkansen of onbevestigde kortingen. Doorverwijzing gebruikt een openbare WhatsApp-deellink; geen adresboekimport en geen automatische berichten naar derden. Deze websitepublicatie wijzigt de afzonderlijke Render-catalogus of het leverancierscontractenarchief niet.

## Live gecombineerd overzicht

Na de eerste vergelijking blijft het oorspronkelijke contactformulier vergrendeld, maar het nieuwe overzicht boven de resultaten heeft een eigen actieve gaskeuze. Gas kan een andere leverancier hebben. Het gasverbruik, contracttype en voorschot zijn via bandkeuzes of exacte bedragen aanpasbaar. Het overzicht rekent direct met dezelfde actuele eigen catalogus in de browser. Geen opslag tijdens het typen. Bij ontbrekend gasverbruik of tarief wordt geen onvolledig totaal als volledige besparing gepresenteerd.

Het gezamenlijke percentage is (som referentie-energiekosten − som aanbod-energiekosten) / som referentie-energiekosten × 100. Dit is een gewogen percentage, geen gemiddelde van de twee losse percentages. Eurobedragen worden in centen opgeteld.

De knop Bewaar dit overzicht gebruikt de bestaande privétoegang voor PATCH /api/offer-lead, actie update_energies. De server valideert en herberekent alle gegevens, behoudt het dossiernummer en ongewijzigde aanbodkeuzes en werkt de gas-/elektriciteitsvelden bij. Er wordt geen tweede lead of extra e-mail aangemaakt. Na factuurupload of bij ingetrokken toestemming wordt wijzigen geweigerd. Openstaande wijzigingen moeten eerst worden opgeslagen voordat de bestaande aanbodkeuze of upload kan doorgaan.
