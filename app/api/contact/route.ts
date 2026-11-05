import {requestAttribution} from "@/lib/attribution";
import {z} from "zod";
import {boundedBody,db,hash,json,rateLimit,recordRequest,sameOrigin,validId} from "@/lib/server";
import {phoneSchema} from "@/lib/validation";
const schema=z.object({company:z.string().trim().min(2).max(120),name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(254),phone:phoneSchema.refine(v=>v.length>0),topic:z.enum(["Energiecontract","Zonnepanelen","Batterij","Energiedelen","Algemeen"]),preferredPeriod:z.enum(["geen","voormiddag","namiddag"]),note:z.string().trim().max(1500),consent:z.literal(true),companyWebsite:z.literal("")}).strict();
export async function POST(req:Request){if(!sameOrigin(req))return json({error:"Ongeldige herkomst."},403);if(!req.headers.get("content-type")?.startsWith("application/json"))return json({error:"Ongeldig aanvraagformaat."},415);
try{let data;const raw=new TextDecoder().decode(await boundedBody(req,12000));try{data=JSON.parse(raw);}catch{return json({error:"Ongeldige aanvraaggegevens."},400);}if(!data||typeof data!=="object"||Array.isArray(data))return json({error:"Controleer uw gegevens."},400);const {id,...input}=data,parsed=schema.safeParse(input),key=req.headers.get("X-Receipt-Token")||"";
if(!validId(id)||!parsed.success||!/^[a-f0-9]{64}$/.test(key))return json({error:"Controleer uw naam, bedrijfsnaam, e-mailadres en telefoonnummer."},400);
const existing=await db().prepare("SELECT reference,access_hash FROM requests WHERE id=?").bind(id).first<{reference:string;access_hash:string}>();if(existing)return await hash(key)===existing.access_hash?json({reference:existing.reference,status:"received"}):json({error:"Aanvraagreferentie al in gebruik."},409);
if(!await rateLimit(req,"contact",8))return json({error:"Te veel aanvragen. Probeer later opnieuw."},429);
const p={...parsed.data,sector:"overig",mode:"phone",aiConsent:false,marketing:false};const receipt=await recordRequest(id,"callback",{...p,attribution:requestAttribution(req)},[],{privacyVersion:"2026-10-16",acknowledged:true,aiCall:false,marketing:false,contactRequested:true},key,false);
return json({reference:receipt.reference,status:"received"},201);
}catch(e){const msg=e instanceof Error?e.message:"";return json({error:msg==="BODY_TOO_LARGE"?"De aanvraag is te groot.":/UNIQUE|constraint/i.test(msg)?"Aanvraag wordt verwerkt. Probeer opnieuw met dezelfde gegevens.":"Opslaan lukt tijdelijk niet. Probeer opnieuw."},msg==="BODY_TOO_LARGE"?413:msg==="EMPTY_BODY"||e instanceof SyntaxError?400:/UNIQUE|constraint/i.test(msg)?409:503);}}
