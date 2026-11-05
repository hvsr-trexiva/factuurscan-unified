import {requestAttribution} from "@/lib/attribution";
import {boundedBody,db,hash,json,rateLimit,recordRequest,sameOrigin,validId} from "@/lib/server";
import {callbackSchema,eligibleSlot} from "@/lib/validation";
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:"Ongeldige herkomst."},403);
 if(!req.headers.get("content-type")?.startsWith("application/json"))return json({error:"Ongeldig aanvraagformaat."},415);
 try{
 const raw=new TextDecoder().decode(await boundedBody(req,12000));let data;
 try{data=JSON.parse(raw);}catch{return json({error:"Ongeldige aanvraaggegevens."},400);}
 if(!data||typeof data!=="object"||Array.isArray(data))return json({error:"Ongeldige aanvraaggegevens."},400);
 const {id,...input}=data;const receiptToken=req.headers.get("X-Receipt-Token")||"";
 const parsed=callbackSchema.safeParse(input);
 if(!validId(id)||!parsed.success||!parsed.data.phone||!/^[a-f0-9]{64}$/.test(receiptToken))return json({error:"Controleer uw gegevens en telefoonnummer."},400);
 const existing=await db().prepare("SELECT reference,access_hash FROM requests WHERE id=?").bind(id).first<{reference:string;access_hash:string}>();
 if(existing)return await hash(receiptToken)===existing.access_hash?json({reference:existing.reference,id,status:"received"}):json({error:"Deze aanvraagreferentie is al in gebruik."},409);
 if(!eligibleSlot(parsed.data.scheduledAt))return json({error:"Kies een werkdag binnen 30 dagen, tussen 9 en 17 uur (Belgische tijd), minimaal één uur vooruit."},400);
 if(!await rateLimit(req,"callback",10))return json({error:"Probeer over een uur opnieuw."},429);
 const receipt=await recordRequest(id,"callback",{...parsed.data,attribution:requestAttribution(req)},[],{privacyVersion:"2026-10-16",acknowledged:true,aiCall:parsed.data.aiConsent,marketing:parsed.data.marketing},receiptToken);if(parsed.data.aiConsent){try{const {queueVoice}=await import("@/lib/voice-queue");await queueVoice(id,parsed.data.scheduledAt);}catch{console.error("Voice callback queue requires follow-up");}}return json({...receipt,id,status:"received"},201);
 }catch(e){const msg=e instanceof Error?e.message:"";if(msg==="BODY_TOO_LARGE")return json({error:"De aanvraag is te groot."},413);if(msg==="EMPTY_BODY")return json({error:"De aanvraag is leeg."},400);if(/UNIQUE|constraint/i.test(msg))return json({error:"Aanvraag wordt al verwerkt. Probeer opnieuw."},409);return json({error:"Opslaan lukt tijdelijk niet. Probeer opnieuw."},503);}
}
