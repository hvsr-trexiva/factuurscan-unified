import {z} from "zod";
import {money,freshMonth,type BusinessTariff} from "./business-compare";
const amount=z.number().finite().min(0).max(1e7);
export const ownProductSchema=z.object({
 id:z.string().min(1).max(200),supplier:z.string().trim().min(2).max(120),product:z.string().min(2).max(160),
 energy:z.enum(["electricity","gas"]),type:z.enum(["fixed","variable"]),
 role:z.enum(["offer","reference"]),approved:z.literal(true),
 singleCents:amount,dayCents:amount.nullable(),nightCents:amount.nullable(),greenCents:amount,wkkCents:amount,fixedAnnual:amount,unitCents:amount,
 sourceSheet:z.number().int().optional(),sourceRow:z.number().int().optional(),minAnnualKwh:amount.optional(),sourceUrl:z.string().url().optional(),sourceSha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),priceBasis:z.enum(["monthly","annual_estimate","fixed"]).optional(),
 signupUrl:z.string().url().refine(s=>s.startsWith("https://")),termsUrl:z.string().url().refine(s=>s.startsWith("https://"))
}).strict().refine(p=>Math.abs(p.unitCents-p.singleCents-p.greenCents-p.wkkCents)<1e-8,"Eenheidsprijs en componenten verschillen");
export const ownCatalogSchema=z.object({version:z.literal("fs-own-monthly-v1"),month:z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),status:z.enum(["draft","approved"]),sourceName:z.string().min(3).max(200),sourceSha256:z.string().regex(/^[a-f0-9]{64}$/).nullable(),approvedAt:z.string().datetime().nullable(),costBasis:z.literal("supply_ex_vat"),calculationBasis:z.enum(["energy_only","supply"]).optional(),extensionSources:z.array(z.object({url:z.string().url(),sha256:z.string().regex(/^[a-f0-9]{64}$/),checkedAt:z.string(),note:z.string()}).strict()).optional(),products:z.array(ownProductSchema).max(300)}).strict().superRefine((c,ctx)=>{
 if(new Set(c.products.map(p=>p.id)).size!==c.products.length)ctx.addIssue({code:"custom",message:"Dubbele tariefreferentie"});
 if(c.status==="approved"&&(!c.sourceSha256||!c.approvedAt||!c.products.some(p=>p.role==="offer")))ctx.addIssue({code:"custom",message:"Bronbestand, goedkeuring en eigen aanbod ontbreken"});
});
export type OwnCatalog=z.infer<typeof ownCatalogSchema>;
export type OwnProduct=z.infer<typeof ownProductSchema> & BusinessTariff;
export type OfferInput={supplier:string;contractType:"fixed"|"variable"|"unknown";energy:"electricity"|"gas";meter:"single"|"dual";dayKwh:number;nightKwh:number;invoiceAnnual:number|null;invoiceBasisConfirmed:boolean;monthlyAdvance:number|null;annualOtherCosts:number|null;vatPercent:number|null};
const positive=(n:number|null)=>n===null||Number.isFinite(n)&&n>=0&&n<=1e7;
export function compareOwnOffers(input:OfferInput,raw:unknown,now=new Date()){
 const c=ownCatalogSchema.parse(raw);
 if(!input.supplier.trim())throw Error("Kies eerst uw huidige leverancier.");
 if(!["fixed","variable","unknown"].includes(input.contractType)||!["electricity","gas"].includes(input.energy)||!["single","dual"].includes(input.meter))throw Error("Controleer het contract- en metertype.");
 if(c.status!=="approved"||(!freshMonth(c.month,now)&&process.env.NEXT_PUBLIC_ALLOW_HISTORICAL_TARIFFS!=="true"))throw Error("Uw persoonlijke voorstel volgt zodra onze actuele maandtabel is vrijgegeven. Upload alvast uw factuur.");
 if(![input.dayKwh,input.nightKwh].every(n=>Number.isFinite(n)&&n>=0)||input.dayKwh+input.nightKwh<=0||input.dayKwh+input.nightKwh>100000||input.meter==="single"&&input.nightKwh!==0||input.energy==="gas"&&input.meter!=="single")throw Error("Vul een geldig jaarverbruik in, tot 100.000 kWh per energietype.");
 if(![input.invoiceAnnual,input.monthlyAdvance,input.annualOtherCosts,input.vatPercent].every(positive)||input.vatPercent!==null&&input.vatPercent>100)throw Error("Controleer de ingevulde bedragen en btw.");
 if(input.invoiceAnnual!==null&&!input.invoiceBasisConfirmed)throw Error("Bevestig dat uw factuurbedrag enkel de jaarlijkse leverancierskost exclusief btw bevat.");
 const energyOnly=c.calculationBasis==="energy_only";
 const annual=(p:OwnProduct)=>{
  if(input.dayKwh+input.nightKwh<(p.minAnnualKwh||0))return null;
  if(input.meter==="dual"&&(p.dayCents===null||p.nightCents===null))return null;
  const energy=money(input.meter==="dual"?(input.dayKwh*p.dayCents!+input.nightKwh*p.nightCents!)/100:input.dayKwh*p.singleCents/100);
  const certificates=money((input.dayKwh+input.nightKwh)*(p.greenCents+p.wkkCents)/100);
  return {tariff:p,energy,certificates,fixed:p.fixedAnnual,annual:energyOnly?energy:money(energy+certificates+p.fixedAnnual)};
 };
 const eligible=(c.products as OwnProduct[]).filter(p=>p.role==="offer"&&p.energy===input.energy);
 const fixedAvailable=eligible.some(p=>p.type==="fixed");
 const type=input.contractType==="unknown"?(fixedAvailable?"fixed":"variable"):input.contractType;
 const matching=eligible.filter(p=>p.type===type);
 const offers=(matching.length?matching:eligible).map(annual).filter((r):r is NonNullable<typeof r>=>r!==null).sort((a,b)=>a.annual-b.annual||a.tariff.id.localeCompare(b.tariff.id));
 if(!offers.length)throw Error("Voor deze aansluiting is nog geen eigen aanbod vrijgegeven. Vraag uw persoonlijke voorstel aan.");
 const refs=(c.products as OwnProduct[]).filter(p=>p.role==="reference"&&p.supplier.trim().toLocaleLowerCase("nl-BE")===input.supplier.trim().toLocaleLowerCase("nl-BE")&&p.type===type&&p.energy===input.energy).map(annual).filter((r):r is NonNullable<typeof r>=>r!==null);
 // Explicit disclosed benchmark: highest cost among reviewed supplier references for the matching type.
 refs.sort((a,b)=>b.annual-a.annual||a.tariff.id.localeCompare(b.tariff.id));
 const table=refs[0]?.annual??null,invoice=energyOnly?null:input.invoiceAnnual,best=offers[0].annual;
 const similar=invoice!==null&&table!==null&&Math.abs(invoice-table)<=Math.max(invoice,table)*.01;
 const chooseTable=table!==null&&(invoice===null||!similar&&table>invoice);
 const baseline=chooseTable?table:invoice;
 const source=chooseTable?"monthly_table":invoice!==null?"invoice":"unavailable";
 const reason=energyOnly&&source==="monthly_table"?"Vergelijking met het duurste passende energieproduct uit de aangeleverde maandtabel; geen bevestiging van uw eigen contractprijs.":source==="monthly_table"?(invoice===null?"Geen bruikbare factuurprijs; maandtabel voor uw leverancier.":invoice<best*1.1?"Factuur ligt minder dan 10% boven het voordeligste aanbod; afzonderlijke tabelindicatie.":"Tabelindicatie geeft een groter verschil; uw factuurresultaat blijft afzonderlijk zichtbaar."):source==="invoice"?(similar?"Gelijkaardig voordeel: factuur krijgt voorrang.":"Vergelijking op uw bevestigde factuurkosten."):refs.length>1?"Meerdere referentieproducten: exacte contractversie nodig.":"Referentietarief ontbreekt; factuurcontrole nodig.";
 return {month:c.month,historical:!freshMonth(c.month,now),source,reason:(!freshMonth(c.month,now)?"Historische testtarieven ("+c.month+"); geen actueel aanbod. ":"")+reason,baseline,energyOnly,referenceType:type,referenceTariff:refs[0]?.tariff??null,assumedFixed:input.contractType==="unknown"&&type==="fixed",assumedVariable:input.contractType==="unknown"&&type==="variable",budget:input.monthlyAdvance===null?null:money(input.monthlyAdvance*12),rows:offers.map(r=>{
 const difference=baseline===null?null:money(baseline-r.annual),invoiceDifference=invoice===null?null:money(invoice-r.annual);
 // A supply-only rate difference is never multiplied across the entire advance.
 const complete=!energyOnly&&source==="invoice"&&invoice!==null&&input.annualOtherCosts!==null&&input.vatPercent!==null;
 const factor=1+(input.vatPercent??0)/100;
 const currentTotal=complete?money((invoice!+input.annualOtherCosts!)*factor):null;
 const offerTotal=complete?money((r.annual+input.annualOtherCosts!)*factor):null;
 const totalSaving=complete?money(currentTotal!-offerTotal!):null;
 return {...r,difference,percentage:energyOnly&&refs.length>0&&refs[0].energy>0?(1-r.tariff.singleCents/refs[0].tariff.singleCents)*100:baseline&&difference!==null?(baseline-r.annual)/baseline*100:null,invoiceDifference,currentTotal,offerTotal,totalSaving,totalPercentage:currentTotal&&totalSaving!==null?totalSaving/currentTotal*100:null};})};
}

// Binding a contract to a real, reproducible offer prevents old/manual models
// from passing the existing signing gates after the comparison model changes.
export function ownProposalCurrent(p:Record<string,any>,catalog:unknown,now=new Date()){
 try{
  const c=ownCatalogSchema.parse(catalog);
  if(p.catalogMonth!==c.month||p.catalogSourceSha256!==c.sourceSha256)return false;
  const result=compareOwnOffers(p.calculation as OfferInput,c,now),row=result.rows.find(r=>r.tariff.id===p.tariffId);
  if(!row||result.baseline===null||p.supplier!==row.tariff.supplier||p.product!==row.tariff.product||p.priceType!==(row.tariff.type==="fixed"?"fixed":"variable_estimate"))return false;
  const current=row.currentTotal??result.baseline,offer=row.offerTotal??row.annual;
  return Math.abs(p.annualCurrent-current)<.005&&Math.abs(p.annualOffer-offer)<.005&&Math.abs(p.supplierCurrent-result.baseline)<.005&&Math.abs(p.supplierOffer-row.annual)<.005;
 }catch{return false;}
}
