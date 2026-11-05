# Aanvulling salesworkspace — 19 oktober 2026

Vergelijkingsbasis: HOA_zichtbare_gegevens.xlsx, onderzoeksbestand van 14 oktober 2026. Geraadpleegd: tab Zichtbare gegevens en Backendverwijzingen. De huidige externe applicatie kon niet opnieuw via publieke webtoegang worden uitgelezen. Het bestand toont schermgegevens en frontendverwijzingen, geen volledige backendimplementatie of database. Er is geen code, logo, product, klantinhoud, nieuwsarchief of prijsdata overgenomen.

| Algemene structuur in onderzoek | FactuurScan |
| --- | --- |
| Bedrijven, contacten, klanttoewijzing | Bestaande bedrijven/import/toewijzing behouden; meerdere contactpersonen, functie, taal, segment en kanaalvoorkeur toegevoegd |
| Afspraak, taak, ticket, meetings | Gezamenlijke werkvoorraad met planning, status, prioriteit, verantwoordelijke, notitie en afrondmoment toegevoegd; meeting als afspraak |
| BelLog | Gespreksresultaat en duur in seconden toegevoegd; aparte bestaande AI-providerresultaten blijven hun bron behouden |
| Contract, offerte, volmacht | Bestaande energiedossiers en afzonderlijke documenthandtekeningen behouden |
| KPI, omzet, backoffice | Rapportage per kanaal, segment, sector en beheerder toegevoegd; intern gewonnen/verloren, verliesreden, verwachte/bevestigde/ontvangen commissie en acquisitiekosten |
| Merge- en bedrijfslookupverwijzingen | Bestaande KBO-adapter behouden; mogelijke dubbele btw/EAN toegevoegd als signaal, zonder samenvoegen |
| Activiteitenlogs | Bestaande tijdlijn uitgebreid met metadata over opgeslagen klantopvolging |
| Marktprijs, nieuws, AI-beller | Bestaande markt- en nieuwsfuncties/provideradapters behouden; geen ongeverifieerde referentieprijzen of externe nieuwsinhoud ingevoerd |
| Prikklok, HR, training | Niet toegevoegd: geen directe bijdrage aan energieoverstap of klantopvolging |

Aanvullende eigen signalen: ontbrekend btw/EAN/contactkanaal, verlopen offerte, te late opvolging en contractreview binnen 90 dagen.

## Gedrag en beheer

- De database blijft D1. Nieuwe registraties staan in `requests.payload.salesWorkspace` met eigen `salesWorkspaceVersion`. Geen extra dienst/account of databaseschema nodig.
- API `/api/admin/workspace`: eigenaarstoegang, same-origin write, begrensde invoer, strikte schema's, optimistische versiecontrole en bestaande bewaartermijn voor actieve/ondertekende dossiers.
- Wijzigingen aan opvolging wijzigen niet `energyVersion`/`energyContractVersion`, contract-PDF's, handtekeningen of contacttoestemming.
- Verloren registreren vereist datum en reden; pauzeert salesopvolging en annuleert nog wachtende salesherinneringen en terugbelacties. Reeds aanvaarde provideracties kunnen niet worden teruggehaald. Heropenen hervat niet automatisch.
- Ontvangen commissie vereist betaaldatum en bewijsreferentie; is een handmatige registratie, geen bankcontrole. Geen commissie of leveranciersacceptatie wordt uit een handtekening afgeleid.
- Taken/afspraken/tickets/gesprekken zijn interne registraties. Geen agenda-uitnodigingen of telefoongesprekken worden door hun invoer verzonden. Bestaande geautoriseerde providers moeten apart gekoppeld worden.
- Rapporten volgen de bestaande filters: dossiers aangemaakt in de gekozen periode, maximaal 1.000 dossiers. Actuele status van deze cohort; geen historische funnelconversie. Gewonnen/afgesloten gebruikt alleen intern gewonnen + verloren als noemer.
- Handtekeningtelling telt dossiers met een workflowhandtekening of afzonderlijk getekend document; een mandaat/eigen overeenkomst is geen bewijs van een getekend leverancierscontract.
- Verwachte/bevestigde/ontvangen commissie en acquisitiekost zijn optioneel, zonder btw. Aantal dossiers met ingevuld bedrag blijft zichtbaar. Geen geschatte CAC/ROAS zonder volledige advertentiekostendata.
- CSV salesrapport volgt dezelfde selectie; formuleachtige tekst wordt geneutraliseerd. Energie-export blijft beschikbaar.
- Maximaal 20 extra contactpersonen en 100 opvolgregistraties per dossier; totale write-body maximaal 65 kB. Extra contactgegevens geven geen toestemming voor outreach.

## Validatie

`test-sales-workspace.cjs` test echte API/modelcode met lokale SQLite: autorisatie, origin, opslag, versieconflict, behoud van energiedata, validatie commissie/verlies, pauze zonder automatische herstart, duplicaat/kwaliteitssignalen, verlopen dossiers en geen contactgegevens in nieuwe auditmetadata. Bestaande sales- en energieworkspacetests worden aanvullend uitgevoerd. TypeScript en productiebuild verplicht. Browser-QA is in deze omgeving niet beschikbaar.
