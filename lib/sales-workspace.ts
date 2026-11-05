import {z} from "zod";
import {caseDate} from "./energy-case";
const text=(max=160)=>z.string().trim().max(max).default("");
const amount=z.number().finite().min(0).max(1e8).nullable().default(null);
const email=z.union([z.literal(""),z.string().trim().email().max(254)]).default("");
const instant=z.union([z.literal(""),z.string().datetime({offset:true})]).default("");
export const workspaceSchema=z.object({
 segment:text(100),language:z.enum(["nl","fr","en","de","other"]).default("nl"),preferredChannel:z.enum(["unknown","email","phone","whatsapp"]).default("unknown"),
 contacts:z.array(z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(120),role:text(100),email,phone:text(40)}).strict()).max(20).default([]),
 entries:z.array(z.object({id:z.string().uuid(),kind:z.enum(["task","appointment","ticket","call"]),title:z.string().trim().min(1).max(200),status:z.enum(["open","waiting","done","cancelled"]).default("open"),priority:z.enum(["normal","high","urgent"]).default("normal"),owner:text(120),dueAt:instant,completedAt:instant,outcome:z.enum(["unknown","no_answer","connected","callback","not_interested","appointment"]).default("unknown"),durationSeconds:z.number().int().nonnegative().max(86400).nullable().default(null),notes:text(2000)}).strict()).max(100).default([]),
 deal:z.object({status:z.enum(["open","won","lost"]).default("open"),closedOn:caseDate,lossReason:text(500),commissionExpected:amount,commissionConfirmed:amount,commissionPaid:amount,commissionReference:text(200),paidOn:caseDate,acquisitionCost:amount,renewalOn:caseDate}).strict().default({status:"open",closedOn:"",lossReason:"",commissionExpected:null,commissionConfirmed:null,commissionPaid:null,commissionReference:"",paidOn:"",acquisitionCost:null,renewalOn:""})
}).strict().superRefine((v,c)=>{for(const list of [v.contacts,v.entries])if(new Set(list.map(x=>x.id)).size!==list.length)c.addIssue({code:"custom",message:"Dubbele registratiereferentie"});if(v.deal.status!=="open"&&!v.deal.closedOn)c.addIssue({code:"custom",message:"Afsluitdatum vereist"});if(v.deal.status==="lost"&&!v.deal.lossReason)c.addIssue({code:"custom",message:"Verliesreden vereist"});if((v.deal.commissionPaid||0)>0&&(!v.deal.paidOn||!v.deal.commissionReference))c.addIssue({code:"custom",message:"Ontvangen commissie vereist betaaldatum en bewijsreferentie"});if(v.deal.commissionPaid!==null&&v.deal.commissionConfirmed!==null&&v.deal.commissionPaid>v.deal.commissionConfirmed)c.addIssue({code:"custom",message:"Ontvangen commissie is hoger dan bevestigde commissie"});});
export type SalesWorkspace=z.infer<typeof workspaceSchema>;
export function emptyWorkspace(p:any={}){return workspaceSchema.parse(p.salesWorkspace||{});}
export const retainedCaseSql="(r.expires_at>? OR EXISTS(SELECT 1 FROM workflows w WHERE w.request_id=r.id AND w.signed_at IS NOT NULL) OR EXISTS(SELECT 1 FROM artifacts a WHERE a.request_id=r.id AND a.kind='case_document' AND json_extract(a.metadata,'$.state')='signed'))";
export function qualityFlags(c:any,now=Date.now()){
 const p=c.contact||{},e=p.energy,ws=emptyWorkspace(p),flags:string[]=[];
 if(!p.email&&!p.phone&&!ws.contacts.some(x=>x.email||x.phone))flags.push("Geen contactkanaal");
 if(!e?.companyNumber&&!p.companyNumber)flags.push("Btw ontbreekt");
 if(!e?.sites?.some((s:any)=>s.electricityEan||s.gasEan))flags.push("EAN ontbreekt");
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 if(ws.deal.status==="open"&&!c.signed_at&&!["signed","supplier"].includes(c.stage)&&e?.offerValidUntil&&e.offerValidUntil<today)flags.push("Offerte vervallen");
 if(ws.entries.some(x=>["open","waiting"].includes(x.status)&&x.dueAt&&Date.parse(x.dueAt)<now))flags.push("Opvolging te laat");
 const ends=[ws.deal.renewalOn,...(e?.sites||[]).map((s:any)=>s.currentContractEnd)].filter(Boolean);
 if(ends.some(d=>{const delta=Date.parse(d+"T00:00:00Z")-now;return delta>=0&&delta<=90*86400000}))flags.push("Contractreview binnen 90 dagen");
 return flags;
}
export function duplicateGroups(customers:any[]){const map=new Map<string,Set<string>>();for(const c of customers){const p=c.contact||{};const keys=[p.energy?.companyNumber||p.companyNumber,...(p.energy?.sites||[]).flatMap((s:any)=>[s.electricityEan,s.gasEan])].filter(Boolean).map(v=>String(v).toUpperCase().replace(/[.\s-]/g,"").replace(/^BE/,""));for(const k of new Set(keys)){if(!map.has(k))map.set(k,new Set());map.get(k)!.add(c.id);}}return [...map.entries()].filter(([,ids])=>ids.size>1).map(([key,ids])=>({key,ids:[...ids]}));}
