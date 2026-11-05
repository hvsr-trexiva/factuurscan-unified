import {situationSchema,areaScenarioSchema,areaScenarioKwh} from "./energy-situation";
import {z} from "zod";
import {compareOwnOffers,type OfferInput} from "./own-offers";
import {proposalMail,type ProposalRow} from "./proposal-presentation";
import {primarySuppliers,isPricedSupplier} from "./supplier-directory";
export const supplierChoices=primarySuppliers;
export const volumeBands={
 electricity:[{id:"e1",label:"Tot 3.500",value:1750},{id:"e2",label:"3.500 – 10.000",value:6750},{id:"e3",label:"10.000 – 25.000",value:17500},{id:"e4",label:"25.000 – 50.000",value:37500},{id:"e5",label:"50.000 – 100.000",value:75000}],
 gas:[{id:"g1",label:"Tot 5.000",value:2500},{id:"g2",label:"5.000 – 15.000",value:10000},{id:"g3",label:"15.000 – 30.000",value:22500},{id:"g4",label:"30.000 – 60.000",value:45000},{id:"g5",label:"60.000 – 100.000",value:80000}]
};
export const advanceBands=[{id:"a1",label:"Tot €100",value:50},{id:"a2",label:"€100 – €250",value:175},{id:"a3",label:"€250 – €500",value:375},{id:"a4",label:"€500 – €1.000",value:750},{id:"a5",label:"€1.000 – €2.500",value:1750}];
export const simpleEnergySchema=z.object({supplier:z.string().trim().min(2).max(120),contractType:z.enum(["fixed","variable","unknown"]),energy:z.enum(["electricity","gas"]),annualKwh:z.number().finite().positive().max(100000),monthlyAdvance:z.number().finite().positive().max(1000000),volumeBand:z.string().max(10).optional(),advanceBand:z.string().max(10).optional(),situation:situationSchema.optional(),areaScenario:areaScenarioSchema.optional()}).strict().superRefine((p,c)=>{
 if(p.areaScenario&&areaScenarioKwh(p.areaScenario.areaM2,p.areaScenario.intensityKwhM2)!==p.annualKwh)c.addIssue({code:"custom",message:"Het oppervlaktescenario en jaarverbruik komen niet overeen."});
 if(p.areaScenario&&p.situation?.floorAreaM2!==p.areaScenario.areaM2)c.addIssue({code:"custom",message:"Controleer de oppervlakte van het scenario."});
 if(p.areaScenario&&p.volumeBand)c.addIssue({code:"custom",message:"Kies een band of een oppervlaktescenario."});
 if(p.volumeBand&&!volumeBands[p.energy].some(b=>b.id===p.volumeBand&&b.value===p.annualKwh))c.addIssue({code:"custom",message:"De verbruikskeuze en het rekenvolume komen niet overeen."});
 if(p.advanceBand&&!advanceBands.some(b=>b.id===p.advanceBand&&b.value===p.monthlyAdvance))c.addIssue({code:"custom",message:"De voorschotkeuze en het rekenbedrag komen niet overeen."});
});
export type SimpleEnergy=z.infer<typeof simpleEnergySchema>;
export function simpleEnergyComparison(raw:unknown,catalog:unknown,now=new Date()){
 const p=simpleEnergySchema.parse(raw);
 if(!isPricedSupplier(p.supplier))throw Error("Voor deze leverancier verzamelen we uw factuur. De prijsvergelijking is nog niet beschikbaar.");
 const input:OfferInput={supplier:p.supplier,contractType:p.contractType,energy:p.energy,meter:"single",dayKwh:p.annualKwh,nightKwh:0,invoiceAnnual:null,invoiceBasisConfirmed:false,monthlyAdvance:p.monthlyAdvance,annualOtherCosts:null,vatPercent:null};
 return compareOwnOffers(input,catalog,now);
}
export function offerEmail(payload:Record<string,any>,reference:string,link:string){
 const snapshots=payload.comparisonsSnapshot||[];
 const best=snapshots.length?snapshots.flatMap((s:any)=>{const r=s.comparison?.rows?.[0];return r?[{energy:s.energy,supplier:r.tariff.supplier,product:r.tariff.product,annual:r.annual,difference:r.difference,percentage:r.percentage,current:s.comparison.baseline,referenceUnitCents:s.comparison.referenceTariff?.singleCents,unitCents:r.tariff.singleCents}]:[]}):(payload.offerProposals||(payload.offerProposal?[payload.offerProposal]:[]));
 const singleBest=Object.values(best.reduce((a:Record<string,any>,o:any)=>{if(!a[o.energy]||o.annual<a[o.energy].annual)a[o.energy]=o;return a},{})) as any[];
 const rows:ProposalRow[]=singleBest.filter((o:any)=>Number.isFinite(o.difference)&&Number.isFinite(o.annual)).map((o:any)=>({energy:o.energy,supplier:o.supplier,product:o.product,current:o.current??Math.round((o.annual+o.difference)*100)/100,offer:o.annual,difference:o.difference,percentage:o.percentage??null,referenceUnitCents:o.referenceUnitCents,unitCents:o.unitCents}));
 return proposalMail({rows,reference,name:payload.name||"",link,month:snapshots[0]?.comparison?.month||best[0]?.month||"",basis:((payload.energyInputs||[]).some((e:any)=>e.areaScenario)?"Oppervlaktescenario met zelfgekozen kWh/m²; geen gemeten jaarverbruik. ":"")+"Scenario op de ingevulde jaarverbruiken. Bandkeuzes gebruiken het midden van de geselecteerde band; controleer dit met uw factuur."});
}

export function recoveryDue(row:{kind:string;payload:string;consents:string;documents:string;state?:string|null;paused?:number},now=Date.now()){
 const p=JSON.parse(row.payload),c=JSON.parse(row.consents);
 return row.kind==="sales_lead"&&c.funnelRecovery===true&&!c.salesPaused&&!c.contactSuppressed&&!c.service?.revokedAt&&!row.paused&&!row.state&&!JSON.parse(row.documents).length&&Date.parse(c.followupUntil||"")>now&&Number.isFinite(Date.parse(p.funnel?.lastActivityAt||""))&&now-Date.parse(p.funnel.lastActivityAt)>=5*60000;
}
