import ownCatalog from "@/data/own-monthly-tariffs.json";import {ownProposalCurrent} from "@/lib/own-offers";
import {z} from "zod";
import {boundedBody,db,hash,json,logEvent,rateLimit,runtime,sameOrigin,StoredRequest} from "@/lib/server";
import {getWorkflow,ready} from "@/lib/workflow";
import {acceptedRoute} from "@/lib/supplier-routes";
import {sessionUrl,signingRequest} from "@/lib/signing-provider";
const input=z.object({id:z.string().uuid(),accepted:z.literal(true)}).strict();
export async function POST(req:Request){
 if(!sameOrigin(req))return json({},403);
 try{
 const data=input.parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,2000)))),key=req.headers.get("x-report-token")||"";
 if(!/^[a-f0-9]{64}$/.test(key))return json({},403);
 const row=await db().prepare("SELECT * FROM requests WHERE id=? AND expires_at>?").bind(data.id,new Date().toISOString()).first<StoredRequest>();
 if(!row||await hash(key)!==row.access_hash)return json({error:"Dossier niet beschikbaar."},404);
 if(!await rateLimit(req,"signing_session",12))return json({error:"Probeer later opnieuw."},429);
 if(JSON.parse(row.consents||"{}").service?.revokedAt)return json({error:"Uw begeleidingsopdracht is ingetrokken."},409);
 let w=await getWorkflow(row.id);const e=runtime();
 if(!w||w.paused||w.signed_at||!ready(JSON.parse(w.gates)))return json({error:"Er is geen vrijgegeven contract om te ondertekenen."},409);
 const p=JSON.parse(w.proposal),r=acceptedRoute(e.SUPPLIER_ROUTES_JSON,p);
 if(!ownProposalCurrent(p,ownCatalog))return json({error:"Dit voorstel moet opnieuw met onze actuele maandtabel worden gecontroleerd."},409);
 if(!r||!e.PANDADOC_API_KEY||!e.PANDADOC_WEBHOOK_SECRET||!e.COMPANY_NUMBER)return json({error:"Ondertekening vraagt een geactiveerde leveranciersafspraak en ondertekenaccount."},503);
 if(Date.parse(p.validUntil)<=Date.now()||p.annualOffer>=p.annualCurrent||p.signerEmail.toLowerCase()!==JSON.parse(row.payload).email.toLowerCase())return json({error:"Dit aanbod moet opnieuw worden gecontroleerd."},409);
 if(w.state==="proposal_ready"&&!w.pandadoc_id){
 const claimed=await db().prepare("UPDATE workflows SET state='signing_creating',updated_at=? WHERE request_id=? AND state='proposal_ready' AND pandadoc_id IS NULL RETURNING request_id").bind(new Date().toISOString(),row.id).first();
 if(!claimed)return json({error:"Uw document wordt klaargezet. Vernieuw de status."},409);
 try{
 const created=await signingRequest(e.PANDADOC_API_KEY,"",{name:`FactuurScan ${row.reference} — ${p.supplier}`,template_uuid:r.templateId,recipients:[{email:p.signerEmail,role:r.signerRole}],tokens:p.tokens,metadata:{factuurscan_request_id:row.id,factuurscan_version:String(w.version),terms_sha256:p.termsSha256,template_sha256:p.contractSha256}});
 if(!/^[a-zA-Z0-9_-]{5,100}$/.test(created.id))throw Error("invalid_document_id");
 await db().batch([db().prepare("UPDATE workflows SET state='document_ready',pandadoc_id=?,updated_at=? WHERE request_id=? AND state='signing_creating'").bind(created.id,new Date().toISOString(),row.id),db().prepare("UPDATE actions SET status='cancelled' WHERE request_id=? AND kind IN ('create_signing','send_proposal') AND status IN ('queued','processing')").bind(row.id)]);
 await logEvent("embedded_document_created",row.id,{documentId:created.id,version:w.version});
 }catch{await db().prepare("UPDATE workflows SET state='signing_needs_review',updated_at=? WHERE request_id=? AND state='signing_creating'").bind(new Date().toISOString(),row.id).run();return json({error:"De documentaanmaak vraagt controle. Er wordt geen dubbel contract gemaakt."},503);}
 w=(await getWorkflow(row.id))!;
 }
 if(!w.pandadoc_id||!["document_ready","proposal_sent"].includes(w.state))return json({error:"Het document vraagt controle voor ondertekening."},409);
 const detail=await signingRequest(e.PANDADOC_API_KEY,`/${w.pandadoc_id}/details`);
 if(detail.metadata?.factuurscan_request_id!==row.id||detail.metadata?.factuurscan_version!==String(w.version)||detail.metadata?.terms_sha256!==p.termsSha256||detail.metadata?.template_sha256!==p.contractSha256||detail.id!==w.pandadoc_id||!detail.recipients?.some(x=>x.email.toLowerCase()===p.signerEmail.toLowerCase()))return json({error:"De ondertekenaar komt niet overeen met uw dossier."},409);
 if(detail.status==="document.uploaded")return json({error:"Uw contract wordt klaargezet. Probeer over enkele seconden opnieuw."},425);
 if(detail.status==="document.draft"&&w.state==="document_ready"){
 const claimed=await db().prepare("UPDATE workflows SET state='signing_sending',updated_at=? WHERE request_id=? AND state='document_ready' RETURNING request_id").bind(new Date().toISOString(),row.id).first();if(!claimed)return json({error:"Contract wordt klaargezet."},409);
 try{await signingRequest(e.PANDADOC_API_KEY,`/${w.pandadoc_id}/send`,{silent:true});await db().prepare("UPDATE workflows SET state='proposal_sent',sent_at=?,updated_at=? WHERE request_id=? AND state='signing_sending'").bind(new Date().toISOString(),new Date().toISOString(),row.id).run();}catch{await db().prepare("UPDATE workflows SET state='signing_needs_review' WHERE request_id=? AND state='signing_sending'").bind(row.id).run();return json({error:"De documentstatus vraagt controle."},503);}
 }else if(!["document.sent","document.viewed"].includes(detail.status||""))return json({error:"Dit document kan nu niet worden ondertekend."},409);
 const session=await signingRequest(e.PANDADOC_API_KEY,`/${w.pandadoc_id}/session`,{recipient:p.signerEmail,lifetime:Math.max(1,Math.min(900,Math.floor((Date.parse(p.validUntil)-Date.now())/1000)))});
 await logEvent("embedded_signing_opened",row.id,{documentId:w.pandadoc_id,version:w.version,termsSha256:p.termsSha256});
 return json({url:sessionUrl(session.id),expiresIn:900});
 }catch{return json({error:"Ondertekening kon niet worden geopend."},400);}
}
