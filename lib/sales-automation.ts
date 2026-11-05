import {db,runtime,logEvent} from "./server";import {followupEligible} from "./sales-model";import {dispatchMail} from "./mail";import {dispatchVoice} from "./voice-queue";
async function key(){const secret=runtime().RATE_LIMIT_SECRET;if(!secret)throw Error("secret_missing");return crypto.subtle.importKey("raw",await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret)),"AES-GCM",false,["encrypt","decrypt"]);}
export async function protectLink(value:string){const iv=crypto.getRandomValues(new Uint8Array(12)),bytes=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(),new TextEncoder().encode(value)));return btoa(String.fromCharCode(...iv,...bytes));}
export async function unprotectLink(value:string){const b=Uint8Array.from(atob(value),c=>c.charCodeAt(0));return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:b.slice(0,12)},await key(),b.slice(12)));}
export async function queueSalesFollowups(){
 const now=new Date().toISOString(),rows=await db().prepare("SELECT r.*,w.paused,w.state FROM requests r LEFT JOIN workflows w ON w.request_id=r.id WHERE r.kind='sales_lead' AND r.expires_at>? AND r.created_at<? ORDER BY r.created_at LIMIT 100").bind(now,new Date(Date.now()-5*60000).toISOString()).all<any>();let queued=0;
 const {recoveryDue}=await import("./simple-energy");const {queueVoice}=await import("./voice-queue");
 for(const r of rows.results){if(!followupEligible(r))continue;const p=JSON.parse(r.payload),c=JSON.parse(r.consents),elapsed=Date.now()-Date.parse(r.created_at);
 if(p.funnel){if(!recoveryDue(r))continue;if(c.aiCall)await queueVoice(r.id,now);if(!c.followupEmail)continue;}
 else if(elapsed<24*3600000)continue;
 const step=p.funnel?"recovery":elapsed>=72*3600000?"2":"1";
 const result=await db().prepare("INSERT OR IGNORE INTO email_outbox(id,request_id,kind,status,attempts,created_at,updated_at) VALUES (?,?,?,'queued',0,?,?)").bind(`${r.id}:sales_followup:${step}`,r.id,`sales_followup:${step}`,now,now).run();queued+=result.meta.changes||0;
 }return queued;
}
export async function runSales(){const {queueCaseDocuments}=await import("./case-signing");const signed=await db().prepare("SELECT DISTINCT request_id FROM artifacts WHERE kind='case_document' AND json_extract(metadata,'$.state')='signed' LIMIT 50").all<{request_id:string}>();for(const row of signed.results)await queueCaseDocuments(row.request_id);const queued=await queueSalesFollowups(),mail=await dispatchMail(),voice=await dispatchVoice();await logEvent("sales_runner",null,{queued,mail,voice});return {queued,mail,voice,analysisWorker:"external_required",signingWorker:"external_required"};}
