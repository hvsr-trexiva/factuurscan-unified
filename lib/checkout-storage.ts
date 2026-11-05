import {bucket,db,hash,logEvent,runtime,type StoredRequest} from "./server";
import {initialCheckout,checkoutProfileSchema,locationSchema,type CheckoutProfile} from "./checkout-profile";
import {extractInvoiceBytes,type ExtractedInvoice} from "./invoice-extraction";
import {companyNumber} from "./company-profile";
export async function checkoutEditable(row:StoredRequest){
 const c=JSON.parse(row.consents);if(!["sales_lead","analysis"].includes(row.kind)||c.salesPaused||c.service?.revokedAt||!c.analysisRequested&&!c.scanRequested)throw Error("Dit dossier kan niet worden gewijzigd.");
 const active=await db().prepare("SELECT request_id FROM workflows WHERE request_id=? AND (signed_at IS NOT NULL OR pandadoc_id IS NOT NULL)").bind(row.id).first();
 const doc=await db().prepare("SELECT id FROM artifacts WHERE request_id=? AND kind='case_document' AND json_extract(metadata,'$.state') IN ('creating','provider_created','sending','sent','signed','needs_review') LIMIT 1").bind(row.id).first();
 if(active||doc)throw Error("Er is al een contract in ondertekening. Laat uw dossier eerst controleren.");
}
export function mergeInvoice(profile:CheckoutProfile,data:ExtractedInvoice){
 const p=structuredClone(profile);let enterprise=p.enterprises.find(e=>data.companyNumber&&companyNumber(e.companyNumber)===companyNumber(data.companyNumber))||p.enterprises.find(e=>data.company&&e.name.toLowerCase()===data.company.toLowerCase());
 if(!enterprise){if(!p.enterprises[0].name&&!p.enterprises[0].companyNumber)enterprise=p.enterprises[0];else if(data.companyNumber||data.company){enterprise={id:crypto.randomUUID(),name:"",companyNumber:"",billingAddress:"",billingSameAsDelivery:false,legalForm:"",vatStatus:"unknown"};p.enterprises.push(enterprise)}else enterprise=p.enterprises[0];}
 enterprise.name||=data.company||"";enterprise.companyNumber||=data.companyNumber||"";if(data.billingAddress&&!enterprise.billingAddress)enterprise.billingSameAsDelivery=false;enterprise.billingAddress||=data.billingAddress||"";p.name||=data.name||"";
 for(const l of data.locations){let target=p.locations.find(s=>s.enterpriseId===enterprise!.id&&((l.electricityEan&&s.electricityEan===l.electricityEan)||(l.gasEan&&s.gasEan===l.gasEan)||(l.address&&s.address.toLowerCase()===l.address.toLowerCase())));
  // One invoice without a delivery address can complete the sole existing location,
  // provided it does not contradict an already known EAN. Never infer a second address.
  const existing=p.locations.filter(s=>s.enterpriseId===enterprise!.id);
  if(!target&&data.locations.length===1&&existing.length===1&&!l.address){const s=existing[0];if(!(l.electricityEan&&s.electricityEan&&l.electricityEan!==s.electricityEan)&&!(l.gasEan&&s.gasEan&&l.gasEan!==s.gasEan))target=s;}
  target||=p.locations.find(s=>s.enterpriseId===enterprise!.id&&!s.address&&!s.electricityEan&&!s.gasEan);
  if(!target){target=locationSchema.parse({id:crypto.randomUUID(),enterpriseId:enterprise.id});p.locations.push(target)}
  const before=structuredClone(target);
  target.address||=l.address||"";target.electricityEan||=l.electricityEan||"";target.gasEan||=l.gasEan||"";if(l.annualElectricity!==null&&(target.electricityTotal===null||["area_scenario","band_scenario"].includes(target.electricitySource))){target.electricityTotal=l.annualElectricity;target.electricitySource="invoice";}
  if(l.annualGas!==null&&(target.gasKwh===null||["area_scenario","band_scenario"].includes(target.gasSource))){target.gasKwh=l.annualGas;target.gasSource="invoice";}
  for(const k of ["solar","floorAreaM2","electricityDay","electricityNight","exclusiveNight","injectionDay","injectionNight"] as const)if(target[k]===null&&l[k]!=null)(target as any)[k]=l[k];
  for(const k of ["meterType","register","heating"] as const)if(target[k]==="unknown"&&l[k]!=null)(target as any)[k]=l[k];
  target.currentSupplier||=data.supplier||"";
  if(target.electricityTotal!==null&&target.electricityDay!==null&&target.electricityNight!==null&&Math.abs(target.electricityTotal-target.electricityDay-target.electricityNight-(target.exclusiveNight||0))>1){for(const k of ["electricityTotal","electricityDay","electricityNight","exclusiveNight","electricitySource"] as const)(target as any)[k]=before[k];data.warnings.push("De gelezen registerverbruiken verschillen van de bewaarde jaarafname. Uw invoer is behouden; controleer de factuurgegevens.");}

 }
 return checkoutProfileSchema.parse(p);
}
export async function processCheckoutFiles(row:StoredRequest,files:File[]){
 await checkoutEditable(row);
 if(!files.length||files.length>5||files.some(f=>!f.size||f.size>10*1024*1024)||files.reduce((n,f)=>n+f.size,0)>20*1024*1024)throw Error("Maximaal 5 bestanden, 10 MB per bestand en 20 MB samen.");
 const p=JSON.parse(row.payload),prior=JSON.parse(row.documents),metadata:any[]=[],keys:string[]=[],results:any[]=[];let profile=initialCheckout(p),committed=false;
 if(prior.length+files.length>20)throw Error("Maximaal 20 documenten per dossier.");
 try{for(const f of files){const bytes=new Uint8Array(await f.arrayBuffer()),head=bytes.slice(0,12);const mime=/\.pdf$/i.test(f.name)&&new TextDecoder().decode(head.slice(0,5))==="%PDF-"?"application/pdf":/\.png$/i.test(f.name)&&head[0]===137&&head[1]===80&&head[2]===78&&head[3]===71&&head[4]===13&&head[5]===10&&head[6]===26&&head[7]===10?"image/png":/\.jpe?g$/i.test(f.name)&&head[0]===255&&head[1]===216&&head[2]===255?"image/jpeg":null;
  if(!mime)throw Error("Gebruik een geldig PDF-, JPG- of PNG-bestand.");
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(b=>b.toString(16).padStart(2,"0")).join("");
  if([...prior,...metadata].some(d=>d.sha256===digest))continue;
  const key=`submissions/${row.id}/invoice/${crypto.randomUUID()}`;keys.push(key);await bucket().put(key,bytes,{httpMetadata:{contentType:mime}});
  metadata.push({key,name:f.name.slice(0,200),size:f.size,contentType:mime,purpose:"invoice",sha256:digest});
  try{const result=await extractInvoiceBytes(bytes,f.name,mime,runtime());profile=mergeInvoice(profile,result.data);results.push({file:f.name.slice(0,200),sha256:digest,...result})}catch{results.push({file:f.name.slice(0,200),sha256:digest,status:"review_required",method:"unavailable",message:"Bestand ontvangen. Controleer of vul de gegevens handmatig aan."})}
 }
 if(!metadata.length)return {ok:true,duplicate:true,profile,version:p.checkoutVersion||0,extractions:p.invoiceExtractions||[]};
 p.checkoutProfile=profile;p.checkoutVersion=(p.checkoutVersion||0)+1;p.checkoutConfirmed=null;p.invoiceExtractions=[...(p.invoiceExtractions||[]),...results].slice(-20);
 if(p.funnel)p.funnel={...p.funnel,stage:"invoice_received",lastActivityAt:new Date().toISOString()};
 const updated=await db().prepare("UPDATE requests SET documents=?,payload=?,kind='analysis',status='received' WHERE id=? AND documents=? AND payload=? AND consents=?").bind(JSON.stringify([...prior,...metadata]),JSON.stringify(p),row.id,row.documents,row.payload,row.consents).run();if(!updated.meta.changes)throw Error("Uw dossier is gewijzigd. Vernieuw en probeer opnieuw.");committed=true;
 await db().prepare("INSERT INTO jobs(id,request_id,kind,created_at,status) VALUES (?,?,'analysis',?,'queued')").bind(crypto.randomUUID(),row.id,new Date().toISOString()).run();
 await db().prepare("UPDATE email_outbox SET status='cancelled' WHERE request_id=? AND kind LIKE 'sales_followup:%' AND status='queued'").bind(row.id).run();
 await db().prepare("UPDATE actions SET status='cancelled' WHERE request_id=? AND kind='voice_callback' AND status='queued'").bind(row.id).run();
 await logEvent("checkout_invoice_received",row.id,{files:metadata.length,extracted:results.filter(r=>r.status==="extracted").length});
 return {ok:true,profile,version:p.checkoutVersion,extractions:p.invoiceExtractions};
 }catch(e){if(committed)return {ok:true,reviewRequired:true,profile,version:p.checkoutVersion,extractions:p.invoiceExtractions};if(keys.length)await bucket().delete(keys);throw e;}
}

/** Apply the same server extractor to invoices received by the existing home form. */
export async function analyzeStoredInvoices(row:StoredRequest){
 await checkoutEditable(row);const p=JSON.parse(row.payload),docs=JSON.parse(row.documents).filter((d:any)=>d.purpose==="invoice"),results:any[]=[];let profile=initialCheckout(p);
 for(const d of docs.slice(0,5)){const file=await bucket().get(d.key);if(!file||file.size>10*1024*1024)continue;try{const result=await extractInvoiceBytes(new Uint8Array(await file.arrayBuffer()),d.name,d.contentType,runtime());profile=mergeInvoice(profile,result.data);results.push({file:d.name,...result})}catch{results.push({file:d.name,status:"review_required",method:"unavailable",message:"Automatische lezing onvolledig. Vul de ontbrekende gegevens aan."})}}
 p.checkoutProfile=profile;p.checkoutVersion=(p.checkoutVersion||0)+1;p.invoiceExtractions=results;
 const r=await db().prepare("UPDATE requests SET payload=? WHERE id=? AND payload=? AND consents=?").bind(JSON.stringify(p),row.id,row.payload,row.consents).run();if(!r.meta.changes)throw Error("Dossier gewijzigd tijdens de analyse.");
 await logEvent("stored_invoice_read",row.id,{files:results.length});return {profile,version:p.checkoutVersion,extractions:results};
}
