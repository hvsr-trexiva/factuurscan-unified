# Talen en betrouwbaarheid

De publieke klantflow gebruikt een React-presentatielaag met een Nederlandse brontekst en een gecontroleerde Franse/Engelse catalogus. Zonder expliciet ?lang=fr of ?lang=en opent de website Nederlands. Geen browsertaaldetectie of opgeslagen taalvoorkeur. Een bewuste taalkeuze blijft binnen de navigatie behouden; Nederlands kiezen verwijdert de query. Huidige overige queryparameters en private fragmenttokens blijven ongewijzigd.

Formulierwaarden, API-enums, persoonlijke invoer, merknamen, berekeningen en toestemmingstoestanden worden niet vertaald. Opties zonder expliciete waarde krijgen vóór vertaling hun oorspronkelijke waarde. Zo blijft bijvoorbeeld een vertaald label voor een vast contract een geldige oorspronkelijke selectie. GET-startformulieren nemen de expliciete taal mee als verborgen veld. Privélinks behouden ID en sleutel uitsluitend in het fragment. De gegenereerde opdracht-/machtigings-PDF blijft Nederlands en leveranciersdocumenten in hun aangeleverde taal; dit wordt in FR/EN bij de ondertekenstap vermeld. De getoonde taal en vertaalversie worden bij nieuwe machtigingen en checkoutopdrachten geregistreerd. Een geactiveerde chat krijgt de gekozen antwoordtaal; browserdicteren gebruikt nl-BE, fr-BE of en-GB.

De homepage heeft herkenbare leveranciersiconen en vier centrale referentieleveranciers. Een afzonderlijke uitklapselectie bevat andere namen uit de officiële VNR-vergunningenlijst, geraadpleegd op 21 oktober 2026. Dat is geen verklaring dat alle genoemde ondernemingen iedere klant of elk energietype bedienen. Andere leveranciers kunnen facturen en gegevens aanleveren; simpleEnergyComparison weigert prijsberekening buiten ENGIE, Luminus, Eneco en TotalEnergies. De eigen OCTA+/Energy Together-aanbodtabel blijft ongewijzigd. De gegevensmachtiging heeft de bredere selectie en een vrije naam via Andere. Historisch Octa+ blijft als input geaccepteerd.

Kleuriconen zijn eigen herkenningstekens, geen officiële bedrijfslogo’s. De Vlaamse leeuw is een eigen gestileerd vectoraccent, geen erkenningszegel. De bestaande kantoorafbeelding staat duidelijk als illustratief sfeerbeeld, niet als echte medewerkers of kantoor. Er zijn geen sterren, verzonnen klanten, klantcitaten of reviewaantallen toegevoegd. Echte testimonials, video’s, teamnamen en kantoor-/teamfoto’s moeten door het bedrijf worden aangeleverd met publicatierecht; bespreking van een ervaring loopt via het bestaande contactkanaal.

De bronnenstrook verwijst naar openbare informatie van CREG, Vlaamse Nutsregulator (voorheen VREG), Fluvius en itsme. Deze bronnen sturen de eigen prijsberekening niet aan en worden niet als goedkeurende partners gepresenteerd. De energiebriefing geeft bronartikelen met controledatum, zonder verzonnen publicatiedatum, prijsstijging of gegarandeerde besparing.

Bronnen:
- https://www.vlaamsenutsregulator.be/elektriciteit-en-aardgas/energiecontracten-en-leveranciers/overzicht-energieleveranciers-met-leveringsvergunning
- https://www.vlaamsenutsregulator.be/nieuws-en-persoverzicht/vreg-vanaf-1-januari-2025-vlaamse-nutsregulator
- https://www.creg.be/nl/consumenten/prijzen-en-tarieven/hoe-kan-u-besparen-op-uw-energiefactuur/wanneer-verander-je-het
- https://www.fluvius.be/nl/meters-en-meterstanden/verbruik-opvolgen

De privacy- en voorwaardenpagina zijn bijgewerkt waar eerdere tekst niet meer overeenkwam met server-PDF-voorinvulling, geconfigureerde OCR, opgeslagen vergelijkingsdossiers en beperkte QR-uploadtokens. Andere dossier-, retentie- en rechtenbepalingen blijven behouden. Privacypagina, voorwaarden en cookies hebben Franse en Engelse tekst; links binnen vertaalde alinea’s blijven klikbaar.

Verificatie omvat alle bestaande tests en test-language.cjs: standaardtaal zonder browser/storagevoorkeur, FR/EN-labels, ongewijzigde formulierwaarden, private fragmenten, GET-taalkeuze, links in vertaalde privacytekst en geen prijsberekening voor bijkomende leveranciers. Browsertests blijven beperkt door de eerder gemelde browserbeveiliging; geen nieuwe browserpoging om die blokkade te omzeilen. Externe live providers worden niet door deze vertaling geactiveerd.
