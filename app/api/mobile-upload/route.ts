import {boundedBody,db,hash,json,rateLimit,runtime,sameOrigin,token,validId,type StoredRequest} from "@/lib/server";
import {privateCase} from "@/lib/private-case";
import {checkoutEditable,processCheckoutFiles} from "@/lib/checkout-storage";
import {queueCheckoutProposal} from "@/lib/checkout-proposal";
async function mobileCase(req:Request){const id=req.headers.get("x-request-id")||new URL(req.url).searchParams.get("id")||"",key=req.headers.get("x-upload-token")||"";if(!validId(id)||!/^[a-f0-9]{64}$/.test(key))return null;const row=await db().prepare("SELECT * FROM requests WHERE id=? AND expires_at>?").bind(id,new Date().toISOString()).first<StoredRequest>();if(!row)return null;const m=JSON.parse(row.payload).mobileUpload;return m&&Date.parse(m.expiresAt)>Date.now()&&m.hash===await hash(key)?row:null;}
export async function GET(req:Request){const r=await mobileCase(req);if(!r)return json({error:"Deze uploadlink is verlopen of ongeldig. Maak een nieuwe QR-code op uw computer."},403);const c=JSON.parse(r.consents);if(c.salesPaused||c.service?.revokedAt)return json({},409);return json({reference:r.reference,files:JSON.parse(r.documents).filter((d:any)=>d.purpose==="invoice").length});}
export async function POST(req:Request){if(!sameOrigin(req))return json({},403);try{
 if(req.headers.get("content-type")?.startsWith("application/json")){
  const p=JSON.parse(new TextDecoder().decode(await boundedBody(req,1000))),row=await privateCase(req,p.id);if(!row)return json({},403);await checkoutEditable(row);if(!await rateLimit(req,"mobile_link",10))return json({},429);const key=token(),expiresAt=new Date(Date.now()+30*60000).toISOString(),payload=JSON.parse(row.payload);payload.mobileUpload={hash:await hash(key),expiresAt};
  const r=await db().prepare("UPDATE requests SET payload=? WHERE id=? AND payload=?").bind(JSON.stringify(payload),row.id,row.payload).run();if(!r.meta.changes)return json({error:"Dossier gewijzigd. Probeer opnieuw."},409);
  return json({url:`${new URL(req.url).origin}/telefoon#${row.id}:${key}`,expiresAt});
 }
 const row=await mobileCase(req);if(!row)return json({},403);if(!await rateLimit(req,"mobile_invoice",10))return json({},429);const bytes=await boundedBody(req,21*1024*1024),form=await new Request(req.url,{method:"POST",headers:{"Content-Type":req.headers.get("content-type")||""},body:new Uint8Array(bytes).buffer}).formData(),files=form.getAll("files");if(files.some(f=>typeof f==="string"))return json({},400);await processCheckoutFiles(row,files as File[]);if(JSON.parse(row.consents).emailProposal)await queueCheckoutProposal(row.id);
 return json({ok:true,reference:row.reference});
 }catch(e){return json({error:e instanceof Error?e.message:"Upload mislukt."},400);}}
