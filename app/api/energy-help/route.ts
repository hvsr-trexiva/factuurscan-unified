import {z} from "zod";
import {boundedBody,db,hash,json,logEvent,rateLimit,recordRequest,runtime,sameOrigin,validId} from "@/lib/server";
import {privateCase} from "@/lib/private-case";
import {phoneSchema} from "@/lib/validation";
import {action} from "@/lib/workflow";
import {requestAttribution} from "@/lib/attribution";
const schema=z.object({id:z.string().uuid(),reason:z.enum(["invoice","company","ean","fluvius","other"]),email:z.string().trim().email().max(254).optional(),phone:phoneSchema.refine(v=>!!v).optional(),callback:z.boolean(),consent:z.literal(true),companyWebsite:z.literal("")}).strict();
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:"Ongeldige herkomst."},403);
 if(!req.headers.get("content-type")?.startsWith("application/json"))return json({},415);
 try{
  const p=schema.parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,2000))));
  if(!validId(p.id))return json({},400);
  if(!runtime().RATE_LIMIT_SECRET)return json({error:"Uw aanvraag kan tijdelijk niet veilig worden opgeslagen."},503);
  const privateMode=req.headers.has("x-report-token");
  if(privateMode){
   const row=await privateCase(req,p.id);if(!row)return json({},403);
   const c=JSON.parse(row.consents);if(c.salesPaused||c.contactSuppressed||c.service?.revokedAt)return json({error:"Uw dossier is gepauzeerd. Neem rechtstreeks contact op."},409);
   if(!await rateLimit(req,"energy_help",15))return json({},429);
   const payload=JSON.parse(row.payload),now=new Date().toISOString();
   const requests=(payload.dataHelpRequests||[]).filter((r:any)=>r.reason!==p.reason);
   payload.dataHelpRequests=[...requests,{reason:p.reason,callback:p.callback,at:now,status:"requested",consentVersion:"FS-DATA-HELP-2026-10-21",providerRequested:false}].slice(-10);
   const result=await db().prepare("UPDATE requests SET payload=? WHERE id=? AND payload=? AND consents=?").bind(JSON.stringify(payload),row.id,row.payload,row.consents).run();if(!result.meta.changes)return json({error:"Dossier gewijzigd. Probeer opnieuw."},409);
   await action(p.callback?"human_callback":"energy_data_followup",row.id,1);
   await logEvent("energy_data_help_requested",row.id,{reason:p.reason,callback:p.callback,providerRequested:false});
   return json({reference:row.reference,status:"requested",message:"Uw vraag is in hetzelfde dossier opgeslagen. Opvolging is aangevraagd; gegevens zijn nog niet bij een leverancier of Fluvius opgehaald."});
  }
  const key=req.headers.get("x-receipt-token")||"";
  if(!/^[a-f0-9]{64}$/.test(key)||!p.email||!p.phone)return json({error:"Vul uw e-mailadres en telefoonnummer in."},400);
  const existing=await db().prepare("SELECT reference,access_hash,payload FROM requests WHERE id=?").bind(p.id).first<{reference:string;access_hash:string;payload:string}>();
  const fingerprint=await hash(JSON.stringify(p));
  if(existing)return await hash(key)===existing.access_hash&&JSON.parse(existing.payload).helpFingerprint===fingerprint?json({reference:existing.reference,status:"requested"}):json({},409);
  if(!await rateLimit(req,"energy_help",6))return json({error:"Te veel aanvragen. Probeer later opnieuw."},429);
  const receipt=await recordRequest(p.id,"callback",{email:p.email,phone:p.phone,name:"",company:"",sector:"overig",mode:"phone",topic:"Energiecontract",note:`Hulp met ontbrekende energiegegevens: ${p.reason}. ${p.callback?"Telefonische opvolging gevraagd.":"Opvolging per e-mail gevraagd."}`,dataHelpRequests:[{reason:p.reason,callback:p.callback,status:"requested",providerRequested:false}],helpFingerprint:fingerprint,attribution:requestAttribution(req)},[],{acknowledged:true,contactRequested:true,callbackRequested:p.callback,aiCall:false,marketing:false,privacyVersion:"2026-10-16",consentVersion:"FS-DATA-HELP-2026-10-21"},key,false);
  await action(p.callback?"human_callback":"energy_data_followup",p.id,1);
  return json({reference:receipt.reference,status:"requested"},201);
 }catch(e){if(e instanceof Error&&e.message==="BODY_TOO_LARGE")return json({error:"De aanvraag is te groot."},413);return json({error:e instanceof z.ZodError?"Controleer uw e-mailadres, telefoonnummer en toestemming.":"Opslaan lukt tijdelijk niet. Probeer opnieuw."},e instanceof z.ZodError||e instanceof SyntaxError?400:503);}
}
