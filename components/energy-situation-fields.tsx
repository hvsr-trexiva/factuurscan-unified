"use client";
import Localize from "./site-language";
import {heatingChoices,type EnergySituation} from "@/lib/energy-situation";
export default function EnergySituationFields({value,onChange,disabled=false}:{value:EnergySituation;onChange:(next:EnergySituation)=>void;disabled?:boolean}){
 function choices<K extends keyof EnergySituation>(label:string,key:K,options:readonly {value:EnergySituation[K];label:string}[]){return <fieldset className="situation-choice" disabled={disabled}><legend>{label}</legend><div>{options.map(o=><button type="button" key={String(o.value)} aria-pressed={value[key]===o.value} onClick={()=>onChange({...value,[key]:o.value})}>{o.label}</button>)}</div></fieldset>}
 return <Localize><div className="energy-situation-fields">{choices("Heeft uw zaak zonnepanelen?","solar",[{value:true,label:"Ja"},{value:false,label:"Nee"}])}{choices("Heeft u een digitale elektriciteitsmeter?","meterType",[{value:"digital",label:"Ja, digitaal"},{value:"analogue",label:"Nee, analoog"},{value:"amr",label:"AMR / telemeting"}])}{choices("Welk type elektriciteitsmeter heeft u?","register",[{value:"single",label:"Enkelvoudig"},{value:"day_night",label:"Tweevoudig (dag/nacht)"},{value:"exclusive_night",label:"Met exclusief nacht"}])}{choices("Hoe verwarmt u de zaak?","heating",heatingChoices.filter(o=>o.value!=="unknown"))}</div></Localize>;
}
