import {bucket,db,hash,logEvent,runtime} from "./server";
import {getWorkflow,ready} from "./workflow";
import {acceptedRoute} from "./supplier-routes";
import {sendTransactional} from "./mail-provider";
export async function queueSupplierContract(id:string){
 const w=await getWorkflow(id);if(!w?.signed_at||!w.pandadoc_id||!ready(JSON.parse(w.gates)))return false;
 const p=JSON.parse(w.proposal),route=acceptedRoute(runtime().SUPPLIER_ROUTES_JSON,p);if(!route)return false;
 // Freeze the route fingerprint in the audit log; changes require operator reconciliation.
 const now=new Date().toISOString();const inserted=await db().prepare("INSERT OR IGNORE INTO email_outbox(id,request_id,kind,status,attempts,created_at,updated_at) VALUES (?,?,?,'queued',0,?,?) RETURNING id").bind(`${id}:supplier:${w.version}`,id,"supplier_contract",now,now).first<{id:string}>();if(inserted)await logEvent("supplier_route_queued",id,{messageId:inserted.id,routeHash:await hash(JSON.stringify(route))});return true;
}
export async function sendSupplierContract(requestId:string,messageId:string){
 const w=await getWorkflow(requestId);if(!w?.signed_at||!w.pandadoc_id||w.paused||!ready(JSON.parse(w.gates)))return {status:"blocked",error:"signed_workflow_required"} as const;
 const p=JSON.parse(w.proposal);if(Date.parse(w.signed_at)>Date.parse(p.validUntil))return {status:"blocked",error:"offer_expired_when_signed"} as const;const r=acceptedRoute(runtime().SUPPLIER_ROUTES_JSON,p);if(!r)return {status:"blocked",error:"supplier_acceptance_missing"} as const;
 const artifact=await db().prepare("SELECT key,sha256 FROM artifacts WHERE request_id=? AND kind='signed_pdf' AND id=?").bind(requestId,`signed:${w.pandadoc_id}`).first<{key:string;sha256:string}>();
 if(!artifact)return {status:"blocked",error:"signed_pdf_missing"} as const;
 const file=await bucket().get(artifact.key);if(!file||file.size>6*1024*1024)return {status:"blocked",error:"signed_pdf_missing_or_too_large"} as const;
 const bytes=new Uint8Array(await file.arrayBuffer());const sha=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(b=>b.toString(16).padStart(2,"0")).join("");
 if(sha!==artifact.sha256||new TextDecoder().decode(bytes.slice(0,5))!=="%PDF-")return {status:"blocked",error:"archive_integrity_failed"} as const;
 let binary="";for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 const routeHash=await hash(JSON.stringify(r));
 const queued=await db().prepare("SELECT details FROM audit WHERE request_id=? AND event='supplier_route_queued' AND json_extract(details,'$.messageId')=? ORDER BY created_at DESC LIMIT 1").bind(requestId,messageId).first<{details:string}>();
 if(!queued||JSON.parse(queued.details).routeHash!==routeHash)return {status:"blocked",error:"supplier_route_changed"} as const;
 await logEvent("supplier_dispatch_started",requestId,{messageId,recipient:r.recipient,routeHash,documentSha256:sha,acceptanceReference:r.acceptanceReference});
 const result=await sendTransactional(runtime(),r.recipient,`FactuurScan — ondertekende zakelijke contractaanvraag ${requestId.slice(0,8).toUpperCase()}`,`Bijgevoegd het ondertekende contract voor ${p.supplier} / ${p.product}.\nDossierreferentie: ${requestId}\nDocument-ID: ${w.pandadoc_id}\nDocument SHA-256: ${sha}\nAanleverafspraak: ${r.acceptanceReference}\n\nGelieve ontvangst en aanvaarding te bevestigen aan admin@factuurscan.be. Dit bericht bevestigt zelf geen geactiveerde levering.`,messageId,[{Name:"ondertekend-energiecontract.pdf",Content:btoa(binary),ContentType:"application/pdf"}]);
 if(result.status==="accepted"){
 await db().prepare("UPDATE workflows SET state='supplier_emailed',supplier_receipt=?,updated_at=? WHERE request_id=? AND pandadoc_id=?").bind(result.providerId,new Date().toISOString(),requestId,w.pandadoc_id).run();
 await logEvent("supplier_email_accepted",requestId,{providerId:result.providerId,routeHash,documentSha256:sha});
 }
 return result;
}
