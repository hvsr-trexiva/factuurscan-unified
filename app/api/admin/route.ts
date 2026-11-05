import {db,json,ownerAuthorized,sameOrigin,boundedBody,validId} from "@/lib/server";import {removeRequest} from "@/lib/delete-request";
export async function GET(){if(!await ownerAuthorized())return json({},403);const result=await db().prepare("SELECT id,reference,kind,created_at,status,payload,consents,documents FROM requests ORDER BY created_at DESC LIMIT 100").all();return json(result.results);}
export async function DELETE(req:Request){if(!sameOrigin(req)||!await ownerAuthorized())return json({},403);const id=new URL(req.url).searchParams.get("id")||"";try{await removeRequest(id);return json({ok:true});}catch{return json({error:"Ondertekend dossier vereist beoordeling van de bewaarplicht vóór verwijdering."},409);}}
export async function PATCH(req:Request){
 if(!sameOrigin(req)||!await ownerAuthorized())return json({},403);
 try{const data=JSON.parse(new TextDecoder().decode(await boundedBody(req,4000)));
 if(!data||!validId(data.id)||!["in_review","waiting_customer","callback_completed"].includes(data.status))return json({error:"Ongeldige dossierstatus."},400);
 const row=await db().prepare("SELECT kind,status FROM requests WHERE id=? AND expires_at>?").bind(data.id,new Date().toISOString()).first<{kind:string;status:string}>();
 if(!row)return json({error:"Dossier niet beschikbaar."},404);
 if(!["received","in_review","waiting_customer","callback_completed"].includes(row.status)||data.status==="callback_completed"&&row.kind!=="callback")return json({error:"Deze statuswijziging is niet beschikbaar voor dit dossier."},409);
 const result=await db().batch([
 db().prepare("UPDATE requests SET status=? WHERE id=? AND status=?").bind(data.status,data.id,row.status),
 db().prepare("INSERT INTO audit (id,request_id,event,created_at,details) SELECT ?,id,'manual_status_changed',?,? FROM requests WHERE id=? AND status=?").bind(crypto.randomUUID(),new Date().toISOString(),JSON.stringify({from:row.status,to:data.status}),data.id,data.status)
 ]);
 if(!result[0].meta.changes)return json({error:"Dossier is intussen gewijzigd. Vernieuw de lijst."},409);
 return json({ok:true,status:data.status});
 }catch{return json({error:"Status opslaan mislukt."},400);}
}
