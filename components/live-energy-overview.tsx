"use client";
import MonthlyAdvanceSlider from "./monthly-advance-slider";
import BrandMark from "./brand-mark";
import {additionalSuppliers} from "@/lib/supplier-directory";
import Localize from "@/components/site-language";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {Flame,Zap,Check} from "lucide-react";
import {compareOwnOffers} from "@/lib/own-offers";
import {combinedSavings} from "@/lib/combined-savings";
import {supplierChoices,simpleEnergySchema,type SimpleEnergy} from "@/lib/simple-energy";
import SavingsFigures from "./savings-figures";

type Comparison=ReturnType<typeof compareOwnOffers>;
type Bundle={energy:"electricity"|"gas";input:SimpleEnergy;comparison:Comparison|null};
const eur=(n:number)=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(n);

export default function LiveEnergyOverview({comparisons,onSave,onPendingChange,locked=false,onContinue,continueBusy=false}:{onContinue?:()=>void;continueBusy?:boolean;comparisons:Bundle[];onSave:(inputs:SimpleEnergy[])=>Promise<void>;onPendingChange:(pending:boolean)=>void;locked?:boolean}){
 const [controlTarget,setControlTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>{setControlTarget(document.getElementById("comparison-adjustments"))},[]);
 const originalGas=comparisons.find(b=>b.energy==="gas"),electricity=comparisons.find(b=>b.energy==="electricity");
 const [includeGas,setIncludeGas]=useState(!!originalGas),[supplier,setSupplier]=useState(originalGas?.input.supplier||electricity?.input.supplier||"");
 const [kwh,setKwh]=useState(originalGas?String(originalGas.input.annualKwh):""),[advance,setAdvance]=useState(originalGas?String(originalGas.input.monthlyAdvance):"");
 const [contractType,setContractType]=useState<SimpleEnergy["contractType"]>(originalGas?.input.contractType||"unknown");
 const [volumeBand,setVolumeBand]=useState(originalGas?.input.volumeBand||""),[advanceBand,setAdvanceBand]=useState(originalGas?.input.advanceBand||"");
 const [catalog,setCatalog]=useState<unknown>(null),[catalogError,setCatalogError]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{let active=true;fetch("/api/own-offers",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(c=>{if(active)setCatalog(c)}).catch(()=>{if(active)setCatalogError(true)});return()=>{active=false}},[]);
 // Keep the saved snapshot visible if catalog retrieval fails; new scenarios need the current catalog.
 const gasInput={...(originalGas?.input.situation?{situation:originalGas.input.situation}:{}),...(originalGas?.input.areaScenario&&Number(kwh)===originalGas.input.annualKwh&&!volumeBand?{areaScenario:originalGas.input.areaScenario}:{}),supplier,contractType,energy:"gas" as const,annualKwh:Number(kwh),monthlyAdvance:Number(advance),...(volumeBand?{volumeBand}:{}),...(advanceBand?{advanceBand}:{})};
 const unchangedGas=!!originalGas&&JSON.stringify(gasInput)===JSON.stringify({...(originalGas.input.situation?{situation:originalGas.input.situation}:{}),...(originalGas.input.areaScenario?{areaScenario:originalGas.input.areaScenario}:{}),supplier:originalGas.input.supplier,contractType:originalGas.input.contractType,energy:"gas",annualKwh:originalGas.input.annualKwh,monthlyAdvance:originalGas.input.monthlyAdvance,...(originalGas.input.volumeBand?{volumeBand:originalGas.input.volumeBand}:{}),...(originalGas.input.advanceBand?{advanceBand:originalGas.input.advanceBand}:{})});
 let gasComparison:Comparison|null=null,calculationError="";
 if(includeGas){
  if(locked&&originalGas)gasComparison=originalGas.comparison;
  else if(catalog&&Number(kwh)>0){try{gasComparison=compareOwnOffers({supplier,contractType,energy:"gas",meter:"single",dayKwh:Number(kwh),nightKwh:0,invoiceAnnual:null,invoiceBasisConfirmed:false,monthlyAdvance:Number(advance)>0?Number(advance):null,annualOtherCosts:null,vatPercent:null},catalog)}catch(e){calculationError=e instanceof Error?e.message:"Gasvergelijking niet beschikbaar."}}
  else if(unchangedGas)gasComparison=originalGas!.comparison;
 }
 const items=[...(electricity?[electricity]:[]),...(includeGas?[{energy:"gas" as const,input:gasInput,comparison:gasComparison}]:[])];
 const total=combinedSavings(items),validGas=simpleEnergySchema.safeParse(gasInput).success;
 const changed=includeGas!==!!originalGas||includeGas&&!unchangedGas;
 useEffect(()=>{onPendingChange(changed&&!locked)},[changed,locked,onPendingChange]);
 async function save(){if(busy)return;setError("");if(includeGas&&!validGas){setError("Vul ook uw gasverbruik en maandvoorschot in om dit overzicht op te slaan.");return;}setBusy(true);try{await onSave(items.map(b=>b.input))}catch(e){setError(e instanceof Error?e.message:"Opslaan mislukt.")}finally{setBusy(false)}}
 const controls=<details className="live-adjustments"><summary>Gas toevoegen of vergelijking aanpassen</summary>  <div className="live-energy-switches">{electricity&&<span><Zap size={18}/><Check size={15}/> Elektriciteit inbegrepen</span>}<label><input type="checkbox" checked={includeGas} disabled={busy||locked||!electricity} onChange={e=>setIncludeGas(e.target.checked)}/><Flame size={18}/> Gas meevergelijken</label></div>
  {includeGas&&<fieldset className="live-gas-fields" disabled={busy||locked}><legend>Uw gasgegevens</legend><div className="live-gas-pair"><label>Gasleverancier<select value={supplier} onChange={e=>setSupplier(e.target.value)}>{[...supplierChoices,...additionalSuppliers].map(s=><option key={s}>{s}</option>)}</select></label><label>Gascontract<select value={contractType} onChange={e=>setContractType(e.target.value as SimpleEnergy["contractType"])}><option value="unknown" disabled>Kies indien gekend</option><option value="fixed">Vast</option><option value="variable">Variabel</option></select></label></div>
   <MonthlyAdvanceSlider id="live-gas-advance" label="aardgas" value={advance} onChange={v=>{setAdvance(v);setAdvanceBand("")}}/>
   <label className="estimated-usage-choice" htmlFor="live-exact-gas"><span>Vul uw geschatte jaarverbruik in (kWh)</span><input id="live-exact-gas" type="number" inputMode="decimal" min="1" max="100000" step="any" value={kwh} onChange={e=>{setKwh(e.target.value);setVolumeBand("")}} placeholder="Bijv. 20000"/></label>
  </fieldset>}
  {changed&&!locked&&<><button className="button" type="button" disabled={busy||!total||includeGas&&!validGas} onClick={()=>void save()}>{busy?"Overzicht opslaan…":"Bewaar dit overzicht in mijn dossier →"}</button><p className="simple-fine">Live voorbeeld. Bewaar uw wijziging om gas aan hetzelfde dossier toe te voegen of eruit te halen. Er wordt hierdoor geen extra e-mail verstuurd.</p></>}
  {!changed&&<p className="simple-fine">Dit overzicht staat in uw dossier.</p>}{locked&&<p className="simple-fine">Uw facturen zijn al ontvangen. De opgeslagen vergelijking blijft hier raadpleegbaar.</p>}{error&&<p className="error" role="alert">{error}</p>}</details>;
 return <Localize>{<section className="live-energy-overview" aria-labelledby="live-energy-title">
  <span className="section-label">UW ENERGIE IN ÉÉN OVERZICHT</span><h2 id="live-energy-title">Uw beste energievoorstel.</h2>
  <p>Het voordeligste passende aanbod uit onze maandtabel, berekend op uw verbruik. Geen keuzestress: één voorstel voor uw energie.</p>{controlTarget&&createPortal(controls,controlTarget)}
  <div className="live-summary" aria-live="polite"><div className="live-summary-head"><span>Energietype</span><span>Referentie / jaar</span><span>Ons aanbod / jaar</span><span>Verschil / jaar</span></div>{items.map(b=>{const r=b.comparison?.rows[0];return <div className="live-summary-row" key={b.energy}><strong>{b.energy==="electricity"?"Elektriciteit":"Gas"}{r&&<small className="best-product-name"><BrandMark name={r.tariff.supplier} compact/> · {r.tariff.product}</small>}</strong><span>{b.comparison?.baseline!==null&&b.comparison?.baseline!==undefined?eur(b.comparison.baseline):"Nog in te vullen"}</span><span>{r?eur(r.annual):"—"}</span><b className={r?.difference!==null&&r?.difference!==undefined&&r.difference<0?"cost-increase":""}>{r?.difference!==null&&r?.difference!==undefined?`${eur(Math.abs(r.difference))} ${r.difference<0?"hoger":"lager"}`:"—"}</b></div>})}
   {total?<div className="live-summary-total"><span className="section-label">{includeGas&&electricity?"ELEKTRICITEIT + GAS SAMEN":"UW TOTALE ENERGIEVERSCHIL"}</span><SavingsFigures difference={total.difference} percentage={total.percentage}/><p>Referentie: {eur(total.current)} / jaar · ons aanbod: {eur(total.offer)} / jaar.</p>{onContinue&&<div className="best-proposal-action"><button type="button" className="button" disabled={continueBusy||changed&&!locked} onClick={onContinue}>{continueBusy?"Uw voorstel bewaren…":total.difference>0?"Bespaar nu — ga verder met dit voorstel →":"Laat mijn factuur controleren →"}</button><p>Kies hieronder: zelf uw gegevens invullen of uw factuur laten lezen. U controleert en keurt goed.</p></div>}<small>Gewogen totaalpercentage = gezamenlijk euroverschil ÷ gezamenlijke referentie-energiekost × 100. Alleen energie excl. btw; estimatie op de maandtabel.</small></div>:<p className="live-incomplete" role="status">{calculationError|| (includeGas&&!Number(kwh)?"Vul uw gasverbruik in om elektriciteit en gas samen te zien.":catalogError?"De actuele tarieftabel kon niet worden geladen. Herlaad de pagina om gas toe te voegen.":includeGas&&!catalog?"De tarieftabel wordt geladen…":"Voor een volledig totaal zijn vergelijkbare tarieven voor beide energietypes nodig.")}</p>}
  </div>

 </section>}</Localize>;
}
