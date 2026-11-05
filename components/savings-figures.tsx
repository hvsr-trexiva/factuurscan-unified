
import Localize from "@/components/site-language";
import {savingsDisplay} from "@/lib/savings-display";
export default function SavingsFigures({difference,percentage,compact=false}:{difference:number|null;percentage:number|null;compact?:boolean}){
 const view=savingsDisplay(difference,percentage);
 return <Localize>{<div className={`savings-figures ${compact?"savings-compact":""} savings-${view.kind}`} data-testid="savings-figures">
  <div><span>{view.label}</span><strong data-testid="saving-euros">{view.annual}</strong><small>{view.kind==="missing"?"Vul uw huidige jaarkost in of lever uw factuur aan.":view.direction==="gelijk"?"per jaar · gelijke kosten":`${view.direction} per jaar`}</small></div>
  <div><span>Procentueel verschil</span><strong data-testid="saving-percent">{view.percent}</strong><small>{view.kind==="missing"?"Een referentieprijs is vereist":view.percent.includes("niet")?"Uw referentiebedrag is nul":view.direction==="gelijk"?"gelijke kosten":`${view.direction} op dezelfde kostenbasis`}</small></div>
  {view.monthly&&<p>{view.monthly} {view.direction==="gelijk"?"verschil":view.direction} per maand · jaarverschil ÷ 12</p>}
 </div>}</Localize>;
}
