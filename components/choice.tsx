"use client";
import Localize from "@/components/site-language";

export function Choice({name,value,onChange,options,label,placeholder,required=false}:{name?:string;value?:string;onChange?:(v:string)=>void;options:{value:string;label:string}[];label:string;placeholder?:string;required?:boolean}){
 return <Localize>{<select className="choice-field" name={name} aria-label={label} required={required} value={value} defaultValue={value===undefined?(placeholder?"":options[0]?.value):undefined} onChange={e=>onChange?.(e.target.value)}>{placeholder&&<option value="" disabled>{placeholder}</option>}{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>}</Localize>;
}
