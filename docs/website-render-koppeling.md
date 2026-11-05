# Website → Render: eerste integratiefase

Nieuwe aanvragen krijgen atomisch een record in `website_bridge`, samen met hun bestaande dossier. Deze tabel is een transportwachtrij, geen tweede leverancierstraject. De website blijft in deze fase de bron voor oorspronkelijke aanvragen en bestanden. De Render-worker kan alleen via een apart, beperkt gedeeld geheim een aanvraag claimen, bestanden lezen en ontvangst bevestigen. De module is standaard uitgeschakeld; er is geen productieverbinding geclaimd.

De eigenaar ziet in Sales → Website ↔ Render de wachtrij, pogingen, controlecodes en Render-klantreferentie. Bestaande actieve aanvragen kunnen maximaal 5.000 per eerste backfill worden klaargezet. De reviewerrol kan status bekijken, maar niet klaarzetten. Latere wijzigingen, intrekkingen en contractstatussen worden nog niet teruggesynchroniseerd. Geïmporteerde toestemming is alleen bewijs ter controle; de Render-import activeert geen contactrechten of campagnes.

Configuratie: `WEBSITE_BRIDGE_ENABLED=true` en een afzonderlijk `WEBSITE_BRIDGE_TOKEN` van minstens 32 tekens. Render krijgt hetzelfde geheim, de officiële website-URL en een vaste bestaande intakecampagne. Alleen de endpoints `/api/integration/website/claim`, `/file` en `/ack` erkennen dit geheim. Het verleent geen eigenaarstoegang of brede platformtoegang.

De lease duurt tien minuten; maximaal acht claims. Manifest en bestanden hebben SHA-256-controles. Verlopen of gewijzigde leases worden geweigerd. Ontvangst na een verloren antwoord kan veilig worden herhaald. Reeds gesynchroniseerde bestanden blijven bij hun eigen bronreferentie. Na acht mislukte claims volgt controle in het dashboard. Bestanden boven de huidige Render-limiet van 2 MiB blijven op de website staan en worden als controlepunt gemeld.

Activeren vereist een bijgewerkte Render-deploy, back-up/herstelcontrole van PostgreSQL en documenten, gedeelde geheime configuratie en een synthetische end-to-endproef. De Render- en GitHub-accounttoegang was bij uitvoering niet beschikbaar; daarvoor wordt geen openbare beheerders- of bearerlink gemaakt. Het activeren van de bridge verplaatst de centrale database niet automatisch.
