import {recordMailContent} from "./mail-history";
import {sendQuote} from "./quote-routing";
import {sendSupplierContract} from "./supplier-delivery";
import {db,runtime,hash} from "./server";
import {mailConfigured,sendTransactional} from "./mail-provider";
export {mailConfigured} from "./mail-provider";
type Message={id:string;request_id:string;kind:string};
export async function dispatchMail(requestId?:string){
 const e=runtime();if(!mailConfigured(e))return {configured:false,processed:0};
 // Never replay an interrupted send whose acceptance is unknown.
 await db().prepare("UPDATE email_outbox SET status='needs_review',last_error='interrupted_send' WHERE status='sending' AND updated_at<?").bind(new Date(Date.now()-120000).toISOString()).run();
 let processed=0;
 for(let i=0;i<4;i++){
 const now=new Date().toISOString();
 const message=await db().prepare("UPDATE email_outbox SET status='sending',attempts=attempts+1,updated_at=? WHERE id=(SELECT m.id FROM email_outbox m JOIN requests r ON r.id=m.request_id WHERE m.status='queued' AND m.attempts<5 AND m.updated_at<=? AND r.expires_at>? AND (? IS NULL OR m.request_id=?) ORDER BY m.created_at LIMIT 1) RETURNING id,request_id,kind").bind(now,now,now,requestId||null,requestId||null).first<Message>();
 if(!message)break;
 if(message.kind.startsWith("case_document:")){const {sendCaseDocument}=await import("./case-signing");const result=await sendCaseDocument(message.request_id,message.kind.slice("case_document:".length),message.id);await db().prepare("UPDATE email_outbox SET status=?,provider_id=?,last_error=?,updated_at=? WHERE id=? AND status='sending'").bind(result.status,"providerId" in result?result.providerId:null,"error" in result?result.error:null,new Date(Date.now()+(result.status==="queued"?60000:0)).toISOString(),message.id).run();processed++;continue;}
 if(message.kind==="supplier_contract"||message.kind.startsWith("supplier_quote:")){
 const result=message.kind==="supplier_contract"?await sendSupplierContract(message.request_id,message.id):await sendQuote(message.request_id,message.id,message.kind.slice("supplier_quote:".length));
 await db().prepare("UPDATE email_outbox SET status=?,provider_id=?,last_error=?,updated_at=? WHERE id=? AND status='sending'").bind(result.status,"providerId" in result?result.providerId:null,"error" in result?result.error:null,new Date(Date.now()+(result.status==="queued"?60000:0)).toISOString(),message.id).run();processed++;continue;
 }
 const row=await db().prepare("SELECT reference,kind,payload,consents FROM requests WHERE id=?").bind(message.request_id).first<{reference:string;kind:string;payload:string;consents:string}>();
 if(!row){await db().prepare("UPDATE email_outbox SET status='cancelled',updated_at=? WHERE id=?").bind(now,message.id).run();continue;}
 const payload=JSON.parse(row.payload);
 if(message.kind.startsWith("invoice_proposal:")){
  const consentRow=await db().prepare("SELECT consents FROM requests WHERE id=?").bind(message.request_id).first<{consents:string}>(),c=JSON.parse(consentRow?.consents||"{}");
  if(!c.emailProposal||c.contactSuppressed||c.salesPaused||c.service?.revokedAt){await db().prepare("UPDATE email_outbox SET status='cancelled' WHERE id=?").bind(message.id).run();continue;}
  try{const {checkoutProposalMail}=await import("./checkout-proposal"),{unprotectLink}=await import("./sales-automation");const digest=message.kind.slice("invoice_proposal:".length),storage=(await import("./server")).bucket(),snapshotFile=await storage.get(`proposals/${message.request_id}/${digest}.json`);if(!snapshotFile)throw Error();const snapshot=await snapshotFile.json() as any;const link=await unprotectLink(snapshot.continueCipher);const content=await checkoutProposalMail(snapshot,row.reference,link.replace("/aanleveren#",snapshot.mailDocuments?.some((d:any)=>d.filename==="uw-leverancierscontract.pdf")?"/rapport#":"/overstap-afronden#"),snapshot.quote);
   const file=await storage.get(`proposals/${message.request_id}/${digest}.pdf`);if(!file||file.size>5*1024*1024)throw Error();const bytes=new Uint8Array(await file.arrayBuffer());const checksum=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(b=>b.toString(16).padStart(2,"0")).join("");if(checksum!==snapshot.pdfSha256)throw Error();let binary="";for(let j=0;j<bytes.length;j+=32768)binary+=String.fromCharCode(...bytes.subarray(j,j+32768));
   if(snapshot.mailDocuments?.length&&snapshot.mailScopeHash!==await hash(JSON.stringify({profile:payload.checkoutProfile||null,confirmation:payload.checkoutConfirmed?.scopeHash||null})))throw Error();
   const attachments:{Name:string;Content:string;ContentType:"application/pdf"}[]=[{Name:"uw-energievoorstel.pdf",Content:btoa(binary),ContentType:"application/pdf"}];
   for(const document of snapshot.mailDocuments||[]){if(!/^(checkout-instructions|case-documents)\//.test(document.key)||!document.key.includes("/"+message.request_id+"/"))throw Error();const stored=await storage.get(document.key);if(!stored||stored.size>5*1024*1024)throw Error();const bytes=new Uint8Array(await stored.arrayBuffer()),sha=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(b=>b.toString(16).padStart(2,"0")).join("");if(sha!==document.sha256)throw Error();let data="";for(let j=0;j<bytes.length;j+=32768)data+=String.fromCharCode(...bytes.subarray(j,j+32768));attachments.push({Name:document.filename,Content:btoa(data),ContentType:"application/pdf"});}
   await recordMailContent(message.id,message.request_id,content.subject,content.text);const result=await sendTransactional(e,payload.email,content.subject,content.text,message.id,attachments,content.html);
   await db().prepare("UPDATE email_outbox SET status=?,provider_id=?,last_error=?,updated_at=? WHERE id=? AND status='sending'").bind(result.status,"providerId" in result?result.providerId:null,"error" in result?result.error:null,new Date(Date.now()+(result.status==="queued"?60000:0)).toISOString(),message.id).run();
  }catch{await db().prepare("UPDATE email_outbox SET status='needs_review',last_error='proposal_preparation_failed' WHERE id=?").bind(message.id).run();}processed++;continue;
 }

 if(message.kind==="proposal_reminder"){
 const consent=JSON.parse(row.consents);if(consent.salesPaused||consent.contactSuppressed||consent.service?.revokedAt||!consent.emailProposal){await db().prepare("UPDATE email_outbox SET status='cancelled' WHERE id=?").bind(message.id).run();continue;}
 try{const {unprotectLink}=await import("./sales-automation");const link=await unprotectLink(payload.continueCipher);const subject=`FactuurScan — uw vergelijking bekijken (${row.reference})`,text=`Beste ${payload.name||"klant"},\nUw FactuurScan-vergelijking en beschikbare documenten staan klaar. Bekijk uw dossier en stel uw vragen voordat u akkoord gaat:\n${link}\nReferentie: ${row.reference}`;await recordMailContent(message.id,message.request_id,subject,text);const result=await sendTransactional(e,payload.email,subject,text,message.id);await db().prepare("UPDATE email_outbox SET status=?,provider_id=?,last_error=?,updated_at=? WHERE id=?").bind(result.status,"providerId" in result?result.providerId:null,"error" in result?result.error:null,new Date().toISOString(),message.id).run();}catch{await db().prepare("UPDATE email_outbox SET status='needs_review' WHERE id=?").bind(message.id).run();}processed++;continue;
 }
 if(message.kind.startsWith("sales_followup:")||row.kind==="sales_lead"&&message.kind==="customer_receipt"){
 const full=await db().prepare("SELECT r.*,w.paused,w.state FROM requests r LEFT JOIN workflows w ON w.request_id=r.id WHERE r.id=?").bind(message.request_id).first<any>();const {followupEligible}=await import("./sales-model");
 if(!full||!followupEligible(full)){await db().prepare("UPDATE email_outbox SET status='cancelled',last_error='followup_not_eligible' WHERE id=?").bind(message.id).run();continue;}
 try{const {unprotectLink}=await import("./sales-automation");const link=await unprotectLink(payload.continueCipher);const first=message.kind==="customer_receipt";
 if(payload.funnel&&first&&!JSON.parse(full.consents).emailProposal||payload.funnel&&!first&&!JSON.parse(full.consents).followupEmail){await db().prepare("UPDATE email_outbox SET status='cancelled' WHERE id=?").bind(message.id).run();continue;}
 const {offerEmail}=await import("./simple-energy");
 const content=payload.funnel?offerEmail(payload,row.reference,link):{subject:`FactuurScan — ${first?"uw analyseaanvraag":"uw factuur nog aanleveren"} (${row.reference})`,text:`Beste ${payload.name||"klant"},\n\nU vroeg een factuuranalyse aan. Voeg uw eindafrekening veilig toe:\n${link}\n\nReferentie: ${row.reference}\nOpvolging stoppen: ${link.replace("/aanleveren#","/aanleveren?stop=1#")}\n\nFactuurScan`};
 const subject=first?content.subject:`FactuurScan — ga verder met uw energievoorstel (${row.reference})`,text=content.text;
 await recordMailContent(message.id,message.request_id,subject,text);const result=await sendTransactional(e,payload.email,subject,text,message.id,[],"html" in content?content.html:undefined);
 await db().prepare("UPDATE email_outbox SET status=?,provider_id=?,last_error=?,updated_at=? WHERE id=? AND status='sending'").bind(result.status,"providerId" in result?result.providerId:null,"error" in result?result.error:null,new Date(Date.now()+(result.status==="queued"?60000:0)).toISOString(),message.id).run();}catch{await db().prepare("UPDATE email_outbox SET status='needs_review',last_error='lead_link_unavailable' WHERE id=?").bind(message.id).run();}processed++;continue;
 }
 const customer=message.kind==="customer_receipt";
 const subject=customer?`FactuurScan — aanvraag ontvangen (${row.reference})`:`FactuurScan — nieuwe ${row.kind==="callback"?"terugbelvraag":"factuuraanvraag"} (${row.reference})`;
 const text=customer?`Beste ${payload.name||"klant"},\n\nWij hebben uw ${row.kind==="callback"?"terugbelvraag":"aanvraag en bestanden"} ontvangen.\nUw referentie: ${row.reference}.\n\n${row.kind==="callback"?payload.scheduledAt?"Uw voorkeursmoment is geregistreerd. Een afspraak vraagt een afzonderlijke bevestiging.":"Uw terugbelverzoek is geregistreerd.":"De ontvangst van uw bestanden bevestigt geen uitgevoerde analyse of afgesloten energiecontract. Bewaar de privérapportlink die op de website werd getoond."}\n\nU kunt op deze e-mail antwoorden met vragen over uw aanvraag.\n\nFactuurScan`:`Er is een nieuwe aanvraag opgeslagen.\nReferentie: ${row.reference}\nSoort: ${row.kind==="callback"?"Terugbelvraag":"Factuuranalyse"}\n\nOpen het beveiligde dossierbeheer: https://factuurscan.be/beheer\n\nDeze melding bevat geen factuurbijlagen.`;
 await recordMailContent(message.id,message.request_id,subject,text);
 const result=await sendTransactional(e,customer?payload.email:e.MAIL_NOTIFICATION_TO!,subject,text,message.id);
 await db().prepare("UPDATE email_outbox SET status=?,provider_id=?,last_error=?,updated_at=? WHERE id=? AND status='sending'").bind(result.status,"providerId" in result?result.providerId:null,"error" in result?result.error:null,new Date(Date.now()+(result.status==="queued"?60000:0)).toISOString(),message.id).run();processed++;
 }
 return {configured:true,processed};
}
