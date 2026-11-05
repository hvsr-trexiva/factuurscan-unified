import {mandateSuppliers} from "./supplier-directory";
import {z} from "zod";
import {companyNumber,eanNumber} from "./company-profile";
export const mandateVersion="FS-DATA-2026-10-16-v1";
export const principal={name:"Factuurscan BV",address:"Louizalaan 209A, Box 7, 1050 Brussels, Belgium",email:"admin@factuurscan.be"};
export const mandateTerms=[
 "Ik machtig Factuurscan BV uitsluitend om voor mijn gratis energiescan de hieronder geselecteerde gegevens op te vragen en te ontvangen bij de genoemde leverancier en/of Fluvius, voor de opgegeven aansluitingen en historische periode.",
 "Deze machtiging geeft geen bevoegdheid om energiecontracten af te sluiten, over te stappen, op te zeggen of te wijzigen, betalingen uit te voeren of bijkomende diensten te bestellen. Marketing en doorverkoop van mijn gegevens vallen er niet onder.",
 "De machtiging geldt vanaf ondertekening gedurende 90 kalenderdagen, tenzij ik eerder intrek. De leverancier of Fluvius mag mijn identiteit en vertegenwoordigingsbevoegdheid controleren en een eigen formulier of goedkeuringsprocedure vragen. Aanvaarding door een leverancier is hiermee niet bevestigd.",
 "Fluvius-meetdata worden pas opgehaald nadat Factuurscan de vereiste dienstverlenerstoegang heeft en ik de specifieke toegang in Mijn Fluvius heb goedgekeurd. Deze verklaring alleen opent geen meterverbinding. De gekozen historische periode geeft geen toestemming voor toekomstige monitoring.",
 "Ik kan deze machtiging intrekken via mijn privé-dossierlink of admin@factuurscan.be. Ik trek een eventuele Mijn Fluvius-toegang ook in bij Fluvius en meld intrekking aan een leverancier waar het mandaat is ingediend. Intrekking stopt toekomstig gebruik; zij maakt eerdere rechtmatige verwerking niet ongedaan.",
 "Mijn gegevens dienen voor de gevraagde energiescan en gegevensopvraging. De online dossierlink vervalt na 30 dagen; de machtiging duurt maximaal 90 dagen. Verwijdering volgt het privacybeleid en de toepasselijke bewaarbeoordeling. Informatie en rechten: https://factuurscan.be/privacy."
];
export const scopeLabels={consumption:"Beschikbare historische afname, injectie en meterstanden (Fluvius: dagwaarden)",invoices:"Energiefacturen en jaarafrekeningen binnen de gekozen periode",contract:"Contractnaam, tariefkaart en toepasselijke prijsvoorwaarden binnen de gekozen periode"};
const date=z.string().regex(/^20\d{2}-\d{2}-\d{2}$/, "Kies een geldige datum.").refine(v=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,"Kies een bestaande kalenderdatum.");
const text=(label:string,max=120)=>z.string().trim().min(2,`Vul ${label} in (minstens 2 tekens).`).max(max,`Gebruik maximaal ${max} tekens.`);
export const mandateSchema=z.object({
 company:text("de bedrijfsnaam"),companyNumber:z.string().trim().max(30,"Gebruik maximaal 30 tekens.").refine(v=>!!companyNumber(v),"Vul een geldig Belgisch ondernemingsnummer in: 10 cijfers met correct controlegetal (BE en punten mogen)."),
 name:text("uw volledige naam"),role:text("uw functie / bevoegdheid",100),email:z.string().trim().email("Vul een geldig e-mailadres in.").max(254,"Het e-mailadres is te lang."),address:z.string().trim().min(8,"Vul straat, huisnummer, postcode en gemeente in.").max(300,"Gebruik maximaal 300 tekens."),
 supplier:z.enum([...mandateSuppliers,"Octa+"]),supplierOther:z.string().trim().max(100,"Gebruik maximaal 100 tekens."),customerNumber:z.string().trim().max(80,"Gebruik maximaal 80 tekens."),
 eans:z.array(z.string().trim().max(25,"De EAN-code is te lang.").refine(v=>!!eanNumber(v),"Vul een geldige Belgische EAN-code in: 18 cijfers, beginnend met 54, met correct controlecijfer.")).min(1,"Vul minstens één EAN-code in.").max(5,"Gebruik maximaal 5 EAN-codes.").refine(a=>new Set(a.map(eanNumber)).size===a.length,"Dezelfde EAN-code staat meer dan één keer in de lijst."),
 from:date,to:date,consumption:z.boolean(),invoices:z.boolean(),contract:z.boolean(),
 authority:z.boolean().refine(v=>v===true,"Bevestig dat u bevoegd bent voor deze onderneming en aansluitingen.").transform(()=>true as const),
 accepted:z.boolean().refine(v=>v===true,"Vink uw toestemming voor deze beperkte gegevensmachtiging aan.").transform(()=>true as const),
 signature:text("uw volledige naam als ondertekening"),companyWebsite:z.literal("")
}).strict().superRefine((p,ctx)=>{
 const today=new Date().toISOString().slice(0,10),minimum=new Date();minimum.setUTCFullYear(minimum.getUTCFullYear()-3);
 if(p.from>p.to)ctx.addIssue({code:"custom",path:["from"],message:"De begindatum moet vóór of op de einddatum liggen."});
 if(p.to>today)ctx.addIssue({code:"custom",path:["to"],message:"De einddatum mag niet in de toekomst liggen."});
 if(p.from<minimum.toISOString().slice(0,10))ctx.addIssue({code:"custom",path:["from"],message:"Kies een begindatum binnen de afgelopen drie jaar."});
 if(!p.consumption&&!p.invoices&&!p.contract)ctx.addIssue({code:"custom",path:["consumption"],message:"Kies minstens één gegevenscategorie."});
 if(p.signature.toLocaleLowerCase("nl-BE")!==p.name.toLocaleLowerCase("nl-BE"))ctx.addIssue({code:"custom",path:["signature"],message:`Onderteken met ‘${p.name}’, zoals ingevuld bij ‘Uw volledige naam’.`});
 if(p.supplier==="Andere"&&p.supplierOther.length<2)ctx.addIssue({code:"custom",path:["supplierOther"],message:"Vul de naam van uw leverancier in."});
});
export const mandateFieldLabels:Record<string,string>={company:"Bedrijfsnaam",companyNumber:"Ondernemingsnummer / btw",name:"Uw volledige naam",role:"Functie / bevoegdheid",email:"E-mailadres",address:"Leveringsadres",supplier:"Leverancier",supplierOther:"Naam leverancier",customerNumber:"Klantnummer",eans:"EAN-codes",from:"Begindatum",to:"Einddatum",consumption:"Gegevenscategorieën",authority:"Vertegenwoordigingsbevoegdheid",accepted:"Toestemming",signature:"Ondertekening"};
export type MandateIssue={field:string;label:string;message:string};
export function mandateIssues(issues:readonly {path:readonly PropertyKey[];message:string}[]):MandateIssue[]{return issues.map(i=>{const field=String(i.path[0]||"form");return {field,label:mandateFieldLabels[field]||"Formulier",message:field==="companyWebsite"?"Controleer het formulier of herlaad de pagina.":`${field==="eans"&&typeof i.path[1]==="number"?`EAN ${i.path[1]+1}: `:""}${i.message}`};});}
export function splitMandateEans(value:string){return value.split(/[\n;,]+/).map(v=>v.trim()).filter(Boolean);}
export type MandateInput=z.infer<typeof mandateSchema>;
export function normalizeMandate(p:MandateInput){return {...p,companyNumber:companyNumber(p.companyNumber)!,eans:p.eans.map(v=>eanNumber(v)!),supplierName:p.supplier==="Andere"?p.supplierOther:p.supplier,phone:"",topic:"Gegevensmachtiging voor gratis energiescan",sector:"overig"};}
export function scopeText(p:Pick<MandateInput,"consumption"|"invoices"|"contract">){return (Object.keys(scopeLabels) as (keyof typeof scopeLabels)[]).filter(k=>p[k]).map(k=>scopeLabels[k]);}
