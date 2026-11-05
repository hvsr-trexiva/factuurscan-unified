import {freshMonth,money,type BusinessTariff} from "./business-compare";
export type EstimateTariff=Omit<BusinessTariff,"type"> & {type:"fixed"|"variable"|"dynamic";dayCents?:number;nightCents?:number;doubleFixedAnnual?:number;indexReference?:{parameter:string;value:number}};
export type EstimateMode="single"|"double"|"dynamic";
export const estimateLabels:Record<EstimateMode,string>={single:"Enkelvoudig",double:"Dag/nacht",dynamic:"Dynamisch · indicatief"};
export function electricityEstimates(p:{kwh:number;dayPercent:number;currentCost:number|null;sameBasis:boolean},products:EstimateTariff[],month:string,now=new Date()){
 if(!freshMonth(month,now))throw Error("De tariefmaand moet worden vernieuwd. Upload uw eindafrekening voor een persoonlijke vergelijking.");
 if(!Number.isFinite(p.kwh)||p.kwh<=0||p.kwh>100000)throw Error("Vul een jaarafname tussen 1 en 100.000 kWh in. Bij een grotere afname kunt u een vergelijking op maat aanvragen.");
 if(!Number.isFinite(p.dayPercent)||p.dayPercent<0||p.dayPercent>100)throw Error("Kies een dagaandeel van 0 tot 100% of upload uw eindafrekening.");
 if(p.currentCost!==null&&(!Number.isFinite(p.currentCost)||p.currentCost<0||p.currentCost>1e7||!p.sameBasis))throw Error("Bevestig dezelfde kostenbasis of laat uw huidige kosten leeg. U kunt ook uw eindafrekening uploaden.");
 const rows=[];const ids=new Set<string>();
 for(const t of products){if(t.energy!=="electricity")continue;if(ids.has(t.id))throw Error("Dubbele tariefvermelding. Vraag een persoonlijke vergelijking aan.");ids.add(t.id);
  if(![t.singleCents,t.greenCents,t.wkkCents,t.fixedAnnual,t.unitCents].every(n=>Number.isFinite(n)&&n>=0)||Math.abs(t.unitCents-t.singleCents-t.greenCents-t.wkkCents)>1e-8)throw Error("Onvolledige prijsbasis. Upload uw eindafrekening voor controle.");
  const modes:EstimateMode[]=t.type==="dynamic"?["dynamic"]:["single",...(t.dayCents!==undefined&&t.nightCents!==undefined?["double" as const]:[])];
  for(const mode of modes){const fixed=mode==="double"?(t.doubleFixedAnnual??t.fixedAnnual):t.fixedAnnual;if(!Number.isFinite(fixed)||fixed<0)throw Error("Onvolledige vaste vergoeding.");
   if(mode==="double"&&![t.dayCents,t.nightCents].every(n=>typeof n==="number"&&Number.isFinite(n)&&n>=0))throw Error("Onvolledig dag-/nachttarief.");
   if(mode==="dynamic"&&(!t.indexReference||!Number.isFinite(t.indexReference.value)))throw Error("Dynamische indexbasis ontbreekt.");
   const dayKwh=p.kwh*p.dayPercent/100,nightKwh=p.kwh-dayKwh,dayEnergy=mode==="double"?money(dayKwh*t.dayCents!/100):null,nightEnergy=mode==="double"?money(nightKwh*t.nightCents!/100):null;
   const energy=mode==="double"?money(dayEnergy!+nightEnergy!):money(p.kwh*t.singleCents/100),certificates=money(p.kwh*(t.greenCents+t.wkkCents)/100),annual=money(energy+certificates+fixed),difference=p.currentCost===null?null:money(p.currentCost-annual);
   rows.push({id:t.id+":"+mode,tariff:t,mode,energy,certificates,fixed:money(fixed),annual,difference,dayKwh,nightKwh,dayEnergy,nightEnergy});
  }
 }
 return rows.sort((a,b)=>a.annual-b.annual||a.id.localeCompare(b.id));
}
