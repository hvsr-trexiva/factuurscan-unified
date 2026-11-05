import {publicOrigin} from "@/lib/request-origin";
import {switchDateIssue} from "@/lib/switch-date";
import {z} from "zod";
import {boundedBody,bucket,db,hash,json,logEvent,rateLimit,runtime,sameOrigin} from "@/lib/server";
import {privateCase} from "@/lib/private-case";
import {initialCheckout,checkoutProfileSchema,missingCheckout} from "@/lib/checkout-profile";
import {checkoutEditable,processCheckoutFiles} from "@/lib/checkout-storage";
import {mailConfigured} from "@/lib/mail-provider";
import {createServicePdf} from "@/lib/mandate-pdf";
import {supplierRoutes} from "@/lib/supplier-routes";
import {serviceTerms,serviceVersion} from "@/lib/service-authorization";
import {checkoutQuote,proposalPacketPdf,proposalDocuments,queueCheckoutProposal} from "@/lib/checkout-proposal";
export async function GET(req:Request){const row=await privateCase(req,new URL(req.url).searchParams.get("id")||"");if(!row)return json({},403);const p=JSON.parse(row.payload),e=runtime();const document=new URL(req.url).searchParams.get("document");if(document){
  let bytes:Uint8Array;if(document==="proposal"){try{bytes=await proposalPacketPdf(p,row.reference,`${publicOrigin(req)}/overstap-afronden#${row.id}:${req.headers.get("x-report-token")}`,await proposalDocuments(row.id,p))}catch{return json({error:"Vul leverancier en jaarverbruik in om een voorstel te maken."},409)}}else if(document==="instruction"&&p.checkoutConfirmed?.documentKey){const file=await bucket().get(p.checkoutConfirmed.documentKey);if(!file)return json({},404);bytes=new Uint8Array(await file.arrayBuffer())}else return json({},404);
  return new Response(new Uint8Array(bytes).buffer,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${document==="proposal"?"energievoorstel":"opdracht-overstapvoorbereiding"}.pdf"`,"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 }return json({reference:row.reference,contact:{email:p.email||"",phone:p.phone||""},proposal:checkoutQuote(p),profile:initialCheckout(p),version:p.checkoutVersion||0,confirmed:p.checkoutConfirmed||null,extractions:p.invoiceExtractions||[],files:JSON.parse(row.documents).map((d:any)=>({name:d.name,size:d.size})),comparisons:p.comparisonsSnapshot||[],readiness:{mail:mailConfigured(e),photoOcr:!!e.OPENAI_API_KEY&&!!e.INVOICE_OCR_MODEL,signing:!!e.PANDADOC_API_KEY&&!!e.PANDADOC_WEBHOOK_SECRET&&!!e.COMPANY_NUMBER&&supplierRoutes(e.SUPPLIER_ROUTES_JSON).some(r=>Date.parse(r.validUntil)>Date.now())},mail:await db().prepare("SELECT kind,status FROM email_outbox WHERE request_id=? AND kind LIKE 'invoice_proposal:%' ORDER BY created_at DESC LIMIT 1").bind(row.id).first()});}
export async function POST(req:Request){if(!sameOrigin(req))return json({},403);const row=await privateCase(req,req.headers.get("x-request-id")||"");if(!row)return json({},403);try{if(!await rateLimit(req,"checkout_invoice",15))return json({},429);const bytes=await boundedBody(req,21*1024*1024),form=await new Request(req.url,{method:"POST",headers:{"Content-Type":req.headers.get("content-type")||""},body:new Uint8Array(bytes).buffer}).formData();const entries=form.getAll("files");if(entries.some(f=>typeof f==="string"))return json({},400);const result=await processCheckoutFiles(row,entries as File[]);if(JSON.parse(row.consents).emailProposal)await queueCheckoutProposal(row.id);return json(result);}catch(e){return json({error:e instanceof Error?e.message:"Upload mislukt."},400);}}
export async function PATCH(req:Request){if(!sameOrigin(req))return json({},403);try{const input=z.object({id:z.string().uuid(),action:z.enum(["save","confirm","email_proposal"]),version:z.number().int().nonnegative(),profile:checkoutProfileSchema.optional(),accepted:z.boolean().optional()}).strict().parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,45000))));const row=await privateCase(req,input.id);if(!row)return json({},403);if(!await rateLimit(req,"checkout_update",60))return json({},429);await checkoutEditable(row);const p=JSON.parse(row.payload);
 if(input.action==="email_proposal")return json(await queueCheckoutProposal(row.id,true));
 if((p.checkoutVersion||0)!==input.version)return json({error:"Uw dossier is intussen gewijzigd, bijvoorbeeld door een telefoonupload. Vernieuw eerst."},409);
 if(!input.profile)return json({},400);const profile=input.profile,missing=missingCheckout(profile);
 if(input.action==="confirm"&&switchDateIssue(profile.desiredStart))return json({error:switchDateIssue(profile.desiredStart)},400);
 if(input.action==="confirm"&&(missing.length||!input.accepted))return json({error:missing.length?"Vul nog aan: "+missing.join(", "):"Bevestig eerst uw opdracht en tekenbevoegdheid."},400);
 p.checkoutProfile=profile;p.checkoutVersion=input.version+1;p.name=profile.name;p.company=profile.enterprises[0].name||p.company;
 p.energyPortfolios=profile.enterprises.map(e=>({company:e.name,companyNumber:e.companyNumber,billingAddress:e.billingAddress,locations:profile.locations.filter(l=>l.enterpriseId===e.id)}));
 const first=profile.enterprises[0];const sites=profile.locations.filter(l=>l.enterpriseId===first.id).map(({id,enterpriseId,separateBilling,billingAddress,...l})=>l);
 if(sites.length)p.energy={...p.energy,companyNumber:first.companyNumber,signerRole:profile.role,billingAddress:first.billingAddress,desiredStart:profile.desiredStart,sites};
 const now=new Date().toISOString();p.checkoutConfirmed=input.action==="confirm"?{at:now,displayLanguage:["nl","fr","en"].includes(req.headers.get("X-FS-Language")||"")?req.headers.get("X-FS-Language"):"nl",languageVersion:"FS-UI-LANG-2026-10-21-v1",documentLanguage:"nl",version:p.checkoutVersion,termsVersion:serviceVersion,termsHash:await hash(JSON.stringify(serviceTerms)),authoritySelfDeclared:true,signatureType:"typed_name_simple",ipHash:await hash((runtime().RATE_LIMIT_SECRET||"")+":"+(req.headers.get("cf-connecting-ip")||"unknown")),userAgent:req.headers.get("user-agent")?.slice(0,300)||""}:null;

 if(p.checkoutConfirmed){
  const evidence=p.checkoutConfirmed,scopeHash=await hash(JSON.stringify({profile,evidence,terms:serviceTerms}));
  const lines=["Opdrachtgever en ondertekenaar",profile.name+" | "+profile.role,...profile.enterprises.flatMap(e=>[e.name+" | "+e.companyNumber,"Facturatie: "+e.billingAddress,...profile.locations.filter(l=>l.enterpriseId===e.id).map(l=>`Locatie ${l.label||l.address} | ${l.address} | EAN elektriciteit ${l.electricityEan||"niet opgegeven"} | EAN gas ${l.gasEan||"niet opgegeven"} | Facturatie ${l.separateBilling?l.billingAddress:e.billingAddress}`)]),"Deze bevestiging is een opdracht tot overstapvoorbereiding. Het leverancierscontract en de bijlagen worden afzonderlijk ondertekend.",...serviceTerms];
  const bytes=await createServicePdf(lines,row.reference,now,scopeHash),key=`checkout-instructions/${row.id}/${scopeHash}.pdf`;
  await bucket().put(key,bytes,{httpMetadata:{contentType:"application/pdf"}});evidence.documentKey=key;evidence.scopeHash=scopeHash;
  evidence.documentHash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new Uint8Array(bytes).buffer))).map(b=>b.toString(16).padStart(2,"0")).join("");
 }
 const updated=await db().prepare("UPDATE requests SET payload=? WHERE id=? AND payload=? AND consents=?").bind(JSON.stringify(p),row.id,row.payload,row.consents).run();if(!updated.meta.changes)return json({error:"Dossier gewijzigd. Vernieuw en probeer opnieuw."},409);
 if(p.checkoutConfirmed)await db().prepare("INSERT OR IGNORE INTO artifacts(id,request_id,kind,key,sha256,created_at,metadata) VALUES (?,?,?,?,?,?,?)").bind("checkout-"+p.checkoutConfirmed.scopeHash,row.id,"checkout_instruction",p.checkoutConfirmed.documentKey,p.checkoutConfirmed.documentHash,now,JSON.stringify(p.checkoutConfirmed)).run();
 await db().prepare("UPDATE workflows SET paused=1,state='review_required',updated_at=? WHERE request_id=? AND pandadoc_id IS NULL AND signed_at IS NULL").bind(now,row.id).run();
 await logEvent(input.action==="confirm"?"checkout_instruction_confirmed":"checkout_profile_saved",row.id,{version:p.checkoutVersion,companies:profile.enterprises.length,locations:profile.locations.length});
 return json({ok:true,version:p.checkoutVersion,confirmed:p.checkoutConfirmed,missing});
 }catch(e){return json({error:e instanceof z.ZodError?e.issues.map(x=>x.message).join(" · "):e instanceof Error?e.message:"Opslaan mislukt."},400);}}
