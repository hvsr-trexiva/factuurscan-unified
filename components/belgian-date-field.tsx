"use client";
import {useEffect,useState} from "react";
import {belgianDate,parseBelgianDate} from "@/lib/switch-date";
export default function BelgianDateField({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const [text,setText]=useState(()=>belgianDate(value)),[touched,setTouched]=useState(false);
 useEffect(()=>{if(!value&&!parseBelgianDate(text))return;setText(belgianDate(value))},[value]);
 const invalid=!!text&&!parseBelgianDate(text);
 return <><input type="text" lang="nl-BE" inputMode="numeric" placeholder="dd/mm/jjjj" aria-label="Voorgestelde startdatum (dag/maand/jaar)" aria-invalid={touched&&invalid} maxLength={10} value={text} disabled={disabled} onBlur={()=>setTouched(true)} onChange={e=>{setText(e.target.value);onChange(parseBelgianDate(e.target.value))}}/>{touched&&invalid&&<small className="field-error">Vul een geldige datum in als dd/mm/jjjj.</small>}</>;
}
