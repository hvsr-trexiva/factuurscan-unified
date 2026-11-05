import {suggestedSwitchDate} from "./switch-date";
import {z} from "zod";
import {connectionSchema,caseDate} from "./energy-case";
import {companyNumber,eanNumber} from "./company-profile";
const text=(max=200)=>z.string().trim().max(max).default("");
const identifier=z.string().regex(/^[a-zA-Z0-9-]{1,50}$/);
export const enterpriseSchema=z.object({id:identifier,name:text(),companyNumber:text(30).refine(v=>!v||!!companyNumber(v),"Controleer het ondernemingsnummer"),billingAddress:text(300),billingSameAsDelivery:z.boolean().default(false),legalForm:text(80),vatStatus:z.enum(["unknown","liable","exempt","pending"]).default("unknown")}).strict();
export const locationSchema=connectionSchema.extend({id:identifier,enterpriseId:identifier,separateBilling:z.boolean().default(false),billingAddress:text(300)}).strict();
export const checkoutProfileSchema=z.object({name:text(180),firstName:text(60),lastName:text(100),paymentPreference:z.enum(["unknown","transfer","direct_debit"]).default("unknown"),role:text(100),desiredStart:caseDate,enterprises:z.array(enterpriseSchema).min(1).max(10),locations:z.array(locationSchema).min(1).max(10)}).strict().superRefine((p,c)=>{
 if(new Set(p.enterprises.map(e=>e.id)).size!==p.enterprises.length||new Set(p.locations.map(l=>l.id)).size!==p.locations.length)c.addIssue({code:"custom",message:"Dubbele bedrijfs- of locatiereferentie"});
 const numbers=p.enterprises.map(e=>companyNumber(e.companyNumber)).filter(Boolean);if(new Set(numbers).size!==numbers.length)c.addIssue({code:"custom",message:"Gebruik één bedrijfsfiche per ondernemingsnummer"});
 const eans=p.locations.flatMap(l=>[l.electricityEan,l.gasEan]).map(eanNumber).filter(Boolean);
 if(new Set(eans).size!==eans.length)c.addIssue({code:"custom",message:"Een EAN kan maar bij één locatie horen"});
 for(const [index,l] of p.locations.entries())if(l.electricityTotal!==null&&l.electricityDay!==null&&l.electricityNight!==null&&Math.abs(l.electricityTotal-l.electricityDay-l.electricityNight-(l.exclusiveNight||0))>1)c.addIssue({code:"custom",path:["locations",index,"electricityTotal"],message:"Totale afname en registerverbruiken sluiten niet aan. Tel uw registers op of controleer uw jaarafrekening."});
 if(p.locations.some(l=>!p.enterprises.some(e=>e.id===l.enterpriseId)))c.addIssue({code:"custom",message:"Koppel elke locatie aan een bedrijf"});
}).transform(p=>({...p,name:p.firstName&&p.lastName?`${p.firstName} ${p.lastName}`:p.name,enterprises:p.enterprises.map(e=>({...e,billingAddress:e.billingSameAsDelivery?p.locations.find(l=>l.enterpriseId===e.id)?.address||"":e.billingAddress}))}));
export type CheckoutProfile=z.infer<typeof checkoutProfileSchema>;
export function initialCheckout(p:Record<string,any>):CheckoutProfile{
 if(p.checkoutProfile)return checkoutProfileSchema.parse({...p.checkoutProfile,desiredStart:p.checkoutProfile.desiredStart||(p.checkoutConfirmed?"":suggestedSwitchDate())});
 const energy=p.energy||{};
 return checkoutProfileSchema.parse({name:p.name||"",role:energy.signerRole||"",desiredStart:energy.desiredStart||suggestedSwitchDate(),enterprises:[{id:"company-1",name:p.company==="Nog te bevestigen"?"":p.company||"",companyNumber:energy.companyNumber||"",billingAddress:energy.billingAddress||"",billingSameAsDelivery:!energy.billingAddress}],locations:(energy.sites?.length?energy.sites:[{}]).map((s:any,i:number)=>({...s,id:`location-${i+1}`,enterpriseId:"company-1",separateBilling:false,billingAddress:""}))});
}
export function missingCheckout(p:CheckoutProfile){
 const missing:string[]=[];
 if(!p.firstName)missing.push("Voornaam van de ondertekenaar");if(!p.lastName)missing.push("Achternaam van de ondertekenaar");
 if(p.name.length<2)missing.push("Naam van de ondertekenaar");if(p.role.length<2)missing.push("Functie / tekenbevoegdheid");
 for(const e of p.enterprises){if(e.name.length<2)missing.push("Bedrijfsnaam");if(!e.companyNumber)missing.push(`Ondernemingsnummer ${e.name||"bedrijf"}`);if(e.billingAddress.length<6)missing.push(`Facturatieadres ${e.name||"bedrijf"}`);if(!p.locations.some(l=>l.enterpriseId===e.id))missing.push(`Aansluiting voor ${e.name||"bedrijf"}`);}
 for(const l of p.locations){if(l.address.length<6)missing.push(`Leveringsadres ${l.label||"locatie"}`);if(!l.electricityEan&&!l.gasEan)missing.push(`EAN ${l.label||"locatie"}`);if(l.separateBilling&&l.billingAddress.length<6)missing.push(`Facturatieadres ${l.label||"locatie"}`);}
 return missing;
}

/** Explicit customer action only: never discard conflicting location data. */
export function combineCheckoutLocations(profile:CheckoutProfile,fromId:string,toId:string):CheckoutProfile{
 const from=profile.locations.find(l=>l.id===fromId),to=profile.locations.find(l=>l.id===toId);
 if(!from||!to||from===to||from.enterpriseId!==to.enterpriseId)throw Error("Kies twee aansluitingen van hetzelfde bedrijf.");
 const defaults=locationSchema.parse({id:to.id,enterpriseId:to.enterpriseId}),merged={...to};
 for(const key of Object.keys(defaults) as (keyof typeof defaults)[]){
  if(key==="id"||key==="enterpriseId")continue;
  const a=to[key],b=from[key],empty=(v:unknown)=>v===defaults[key]||v===""||v===null;
  if(empty(b))continue;
  if(empty(a)){(merged as any)[key]=b;continue;}
  if(typeof a==="string"&&typeof b==="string"&&a.trim().toLowerCase().replace(/\s+/g," ")===b.trim().toLowerCase().replace(/\s+/g," "))continue;
  if(a!==b)throw Error("Samenvoegen kan niet: de aansluitingen bevatten verschillende gegevens ("+key+"). Controleer deze eerst.");
 }
 return checkoutProfileSchema.parse({...profile,locations:profile.locations.filter(l=>l.id!==fromId).map(l=>l.id===toId?merged:l)});
}
