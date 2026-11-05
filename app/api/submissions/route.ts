import {energyCaseSchema} from "@/lib/energy-case";
import {requestAttribution} from "@/lib/attribution";
import {serviceSchema,serviceTerms,serviceVersion,serviceReceiptLines} from "@/lib/service-authorization";
import {db,recordRequest,rateLimit,platformAuthorized,hash,token} from "@/lib/server";
import {env} from "@/lib/node-runtime";
import {z} from "zod";
import {phoneSchema} from "@/lib/validation";

const schema=z.object({freeScan:z.boolean().default(true),sector:z.enum(["horeca","retail","kantoor","praktijk","industrie","overig"]).default("overig"),area:z.string().max(20).refine(v=>v===""||(Number.isFinite(Number(v))&&Number(v)>=1&&Number(v)<=1000000)).default(""),followup:z.boolean().default(false),whatsapp:z.boolean().default(false),marketing:z.boolean().default(false),companyWebsite:z.literal("").default(""),company:z.string().trim().min(2).max(120),name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(254),phone:phoneSchema,note:z.string().max(2000),consent:z.literal("yes"),interests:z.array(z.enum(["Energiecontract","Verbruik & kosten","Zonnepanelen","Batterij"])).max(4)});
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
const maxBody=21*1024*1024;
export async function POST(request:Request){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return reply({error:"Deze aanvraag komt niet van de website."},403);
 const id=request.headers.get("X-Submission-ID")||"";
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))return reply({error:"Ongeldige aanvraagreferentie. Vernieuw de pagina."},400);
 const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;
 if(!bucket)return reply({error:"Bestandsopslag is tijdelijk niet beschikbaar. Probeer later opnieuw."},503);
 if(!request.headers.get("content-type")?.startsWith("multipart/form-data"))return reply({error:"Lever de bestanden via het formulier aan."},400);
 const receiptToken=request.headers.get("X-Receipt-Token")||(reqInbound(request)&&await platformAuthorized(request)?token():"");
 if(!/^[a-f0-9]{64}$/.test(receiptToken))return reply({error:"Vernieuw de pagina en probeer opnieuw."},400);
 const uploaded:string[]=[];let locked=false;
 try{
  if(!await rateLimit(request,"upload",10))return reply({error:"Te veel aanvragen. Probeer over een uur opnieuw."},429);
  // Read with an explicit cap before multipart parsing, including chunked requests.
  if(Number(request.headers.get("content-length")||0)>maxBody)return reply({error:"De aanvraag is te groot. Maximaal 20 MB aan bestanden."},413);
  if(!request.body)return reply({error:"De aanvraag is leeg."},400);
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBody){await reader.cancel();return reply({error:"De aanvraag is te groot. Maximaal 20 MB aan bestanden."},413);}chunks.push(value);}
  const body=new Uint8Array(size);let offset=0;for(const c of chunks){body.set(c,offset);offset+=c.length;}
  const form=await new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")!},body:body.buffer}).formData();
  let interests:unknown;try{interests=JSON.parse(String(form.get("interests")||"[]"));}catch{return reply({error:"Ongeldige advieskeuze."},400);}
  const parsed=schema.safeParse({...Object.fromEntries(["company","name","email","phone","note","consent","sector","area","companyWebsite"].map(k=>[k,form.get(k)|| (k==="sector"?"overig":"")])),followup:form.get("followup")==="true",whatsapp:form.get("whatsapp")==="true",marketing:form.get("marketing")==="true",interests});
  if(!parsed.success)return reply({error:"Controleer uw bedrijfsnaam, contactpersoon, e-mailadres en bevestiging."},400);
  let intakeEnergy=null;const energyRaw=form.get("energyCase");if(energyRaw){try{const checked=energyCaseSchema.safeParse({...JSON.parse(String(energyRaw)),confirmedStart:"",supplierConfirmation:""});if(!checked.success)return reply({error:checked.error.issues.map(x=>x.message).join(" · ")},400);intakeEnergy=checked.data}catch{return reply({error:"Controleer uw energiegegevens"},400)}}
  let service=null;const serviceRaw=form.get("serviceAuthorization");
  if(serviceRaw){let raw;try{raw=JSON.parse(String(serviceRaw));}catch{return reply({error:"De opdrachtgegevens konden niet worden gelezen. Herlaad de pagina of dien alleen uw energiescan in."},400);}const checked=serviceSchema.safeParse(raw);if(!checked.success)return reply({error:checked.error.issues.map(i=>i.message).join(" "),fields:checked.error.issues.map(i=>({field:i.path.join("."),message:i.message})),code:"authorization_incomplete",canSubmitScan:true},400);service=checked.data;if(service.signature.toLocaleLowerCase("nl-BE")!==parsed.data.name.toLocaleLowerCase("nl-BE"))return reply({error:"Onderteken met dezelfde volledige naam als uw contactgegevens."},400);}
  const serviceHash=service?await hash(JSON.stringify({version:serviceVersion,contact:{company:parsed.data.company,name:parsed.data.name,email:parsed.data.email},service,terms:serviceTerms})):null;
  const files=form.getAll("files");
  if(!files.length||files.length>5||files.some(f=>typeof f==="string"))return reply({error:"Voeg 1 tot 5 facturen toe."},400);
  const uploads=files as File[];
  if(uploads.some(f=>!f.size||f.size>10*1024*1024)||uploads.reduce((s,f)=>s+f.size,0)>20*1024*1024)return reply({error:"Maximaal 10 MB per bestand en 20 MB in totaal."},400);
  const validated=[];
  for(const file of uploads){
   const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
   const pdf=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
   const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10;
   const ext=file.name.split(".").pop()?.toLowerCase();
   if(!((pdf&&ext==="pdf")||(jpg&&(ext==="jpg"||ext==="jpeg"))||(png&&ext==="png")))return reply({error:"Een bestand is geen geldig PDF-, JPG- of PNG-bestand."},400);
   validated.push({file,contentType:pdf?"application/pdf":jpg?"image/jpeg":"image/png"});
  }
  const existing=await db().prepare("SELECT reference,access_hash,status,consents FROM requests WHERE id=?").bind(id).first<{reference:string;access_hash:string;status:string;consents?:string}>();
  if(existing&&serviceHash&&JSON.parse(existing.consents||"{}").service?.scopeHash!==serviceHash)return reply({error:"Deze referentie hoort bij een andere opdracht. Start een nieuwe aanvraag voor gewijzigde voorwaarden."},409);
  if(existing)return await hash(receiptToken)===existing.access_hash?reply({reference:existing.reference,id,accessToken:receiptToken,status:existing.status}):reply({error:"Deze aanvraagreferentie is al in gebruik."},409);
  await db().prepare("INSERT INTO audit (id,request_id,event,created_at,details) VALUES (?,?,?,?,?)").bind(`upload-${id}`,id,"upload_pending",new Date().toISOString(),"{}").run();locked=true;
  const metadata=[];
  for(let i=0;i<validated.length;i++){
   const {file,contentType}=validated[i],fileKey=`submissions/${id}/files/${i}`;
   uploaded.push(fileKey);
   await bucket.put(fileKey,await file.arrayBuffer(),{httpMetadata:{contentType}});
   metadata.push({key:fileKey,name:file.name.slice(0,200),size:file.size,contentType,purpose:"invoice"});
  }
  const inbound=reqInbound(request)&&await platformAuthorized(request);
  if(inbound){parsed.data.followup=false;parsed.data.whatsapp=false;parsed.data.marketing=false;}
  let serviceEvidence=null;
  if(service){const acceptedAt=new Date().toISOString(),scopeHash=serviceHash!;const {createServicePdf}=await import("@/lib/mandate-pdf");const pdf=await createServicePdf(serviceReceiptLines(service,parsed.data,acceptedAt),`FS-${id.slice(0,8).toUpperCase()}`,acceptedAt,scopeHash);const pdfKey=`submissions/${id}/files/opdracht`;uploaded.push(pdfKey);await bucket.put(pdfKey,pdf,{httpMetadata:{contentType:"application/pdf"}});metadata.push({key:pdfKey,name:"opdracht-energiebegeleiding.pdf",size:pdf.length,contentType:"application/pdf",purpose:"service_authorization"});serviceEvidence={...service,terms:serviceTerms,acceptedAt,scopeHash,documentHash:Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new Uint8Array(pdf).buffer))).map(b=>b.toString(16).padStart(2,"0")).join(""),validUntil:new Date(Date.now()+90*86400000).toISOString(),revokedAt:null,ip:request.headers.get("cf-connecting-ip")||null,userAgent:(request.headers.get("user-agent")||"").slice(0,500),identityVerified:false,providerAccepted:false};}
  const receipt=await recordRequest(id,"analysis",{...parsed.data,attribution:requestAttribution(request),...(intakeEnergy?{energy:intakeEnergy,energyVersion:1}:{})},metadata,{privacyVersion:"2026-10-16",acknowledged:!inbound,channel:inbound?"email":"website",emailAnalysisRequested:inbound,aiCall:parsed.data.followup,whatsapp:parsed.data.whatsapp,marketing:parsed.data.marketing,analysisRequested:true,emailProposal:!inbound,scanRequested:true,scanPrice:0,currency:"EUR",...(serviceEvidence?{service:serviceEvidence}:{})},receiptToken);
  try{
   const {runtime}=await import("@/lib/server");if(runtime().RATE_LIMIT_SECRET&&!inbound){const {protectLink}=await import("@/lib/sales-automation");const cipher=await protectLink(`${new URL(request.url).origin}/overstap-afronden#${id}:${receiptToken}`);await db().prepare("UPDATE requests SET payload=json_set(payload,'$.continueCipher',?) WHERE id=?").bind(cipher,id).run();}
   const row=await db().prepare("SELECT * FROM requests WHERE id=?").bind(id).first<import("@/lib/server").StoredRequest>();if(row){const {analyzeStoredInvoices}=await import("@/lib/checkout-storage");await analyzeStoredInvoices(row);if(!inbound){const {queueCheckoutProposal}=await import("@/lib/checkout-proposal");await queueCheckoutProposal(id);}}
  }catch{console.error("Invoice suggestions need review; original files remain stored");}
  if(serviceEvidence){try{const {queueQuotes}=await import("@/lib/quote-routing");await queueQuotes(id);const {dispatchMail}=await import("@/lib/mail");await dispatchMail(id);}catch{console.error("Quotation dispatch deferred");}}
  return reply({...receipt,id,status:"received"},201);
 }catch(error){
  if(!locked&&error instanceof Error&&/UNIQUE|constraint/i.test(error.message))return reply({error:"Uw aanvraag wordt al verwerkt. Probeer opnieuw met dezelfde gegevens."},409);
  if(uploaded.length)try{await bucket.delete(uploaded);}catch{}
  console.error("Invoice submission failed",error instanceof Error?error.name:"unknown");
  return reply({error:"Uw aanvraag kon niet worden opgeslagen. Uw gegevens blijven in het formulier; probeer opnieuw."},503);
 }finally{if(locked)try{await db().prepare("DELETE FROM audit WHERE id=?").bind(`upload-${id}`).run();}catch{}}
}

function reqInbound(request:Request){return new URL(request.url).pathname==="/api/platform/inbound";}
