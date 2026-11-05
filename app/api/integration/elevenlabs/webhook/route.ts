import {z} from "zod";
import {boundedBody,db,hash,json,runtime} from "@/lib/server";
import {verifyElevenSignature} from "@/lib/elevenlabs";
const event=z.object({type:z.enum(['post_call_transcription','call_initiation_failure','post_call_audio']),event_timestamp:z.number().int().min(0).max(4102444800),data:z.object({agent_id:z.string().max(160),conversation_id:z.string().min(5).max(160),failure_reason:z.string().max(100).optional(),transcript:z.array(z.object({role:z.string().max(20),message:z.string().nullable().optional()}).passthrough()).max(1000).optional(),metadata:z.object({call_duration_secs:z.number().nonnegative().optional()}).passthrough().optional(),analysis:z.object({transcript_summary:z.string().max(20000).optional(),data_collection_results:z.record(z.object({value:z.unknown()}).passthrough()).optional()}).passthrough().optional()}).passthrough()}).passthrough();
export async function POST(req:Request){
 const e=runtime();if(!e.ELEVENLABS_WEBHOOK_SECRET)return json({},503);
 let raw:Uint8Array;try{raw=await boundedBody(req,256000);}catch{return json({},413);}
 if(!await verifyElevenSignature(raw,req.headers.get('elevenlabs-signature'),e.ELEVENLABS_WEBHOOK_SECRET))return json({},401);
 let p:z.infer<typeof event>;try{p=event.parse(JSON.parse(new TextDecoder().decode(raw)));}catch{return json({},400);}
 if(p.data.agent_id!==e.ELEVENLABS_AGENT_ID)return json({},403);
 if(p.type==='post_call_audio')return json({ok:true,ignored:'audio_not_retained'});
 // Never trust a customer/model supplied case ID: bind to our own accepted provider response.
 const row=await db().prepare("SELECT r.id,r.expires_at FROM requests r JOIN actions a ON a.request_id=r.id WHERE a.kind='voice_callback' AND json_extract(a.result,'$.provider')='elevenlabs' AND json_extract(a.result,'$.callId')=? LIMIT 1").bind(p.data.conversation_id).first<{id:string;expires_at:string}>();
 if(!row)return json({error:'call_not_registered'},409);
 if(Date.parse(row.expires_at)<=Date.now())return json({ok:true,ignored:'expired_case'});
 const data=p.data.analysis?.data_collection_results||{},value=data.outcome?.value,allowed=['completed','no_answer','failed','callback_requested','do_not_call','interested','invoice_requested','human_requested'];
 const outcome=p.type==='call_initiation_failure'?(p.data.failure_reason==='no-answer'?'no_answer':'failed'):(typeof value==='string'&&allowed.includes(value)?value:'completed');
 const summary=(p.data.analysis?.transcript_summary||'').slice(0,6000),transcript=(p.data.transcript||[]).map(t=>({role:t.role,message:(t.message||'').slice(0,4000)}));
 let remaining=40000;const boundedTranscript=transcript.map(t=>{const message=t.message.slice(0,Math.max(0,remaining));remaining-=message.length;return {...t,message}}).filter(t=>t.message);
 const now=new Date().toISOString(),id='elevenlabs:'+await hash(p.type+':'+p.data.conversation_id);
 if(await db().prepare("SELECT id FROM audit WHERE id=?").bind(id).first())return json({ok:true,replayed:true});
 await db().batch([
  db().prepare("INSERT OR IGNORE INTO audit(id,request_id,event,created_at,details) VALUES (?,?,'energy_input',?,?)").bind(id,row.id,now,JSON.stringify({provider:'elevenlabs',channel:'voice',externalId:p.data.conversation_id,eventId:id,occurredAt:new Date(p.event_timestamp*1000).toISOString(),outcome,summary,transcript:boundedTranscript,durationSeconds:p.data.metadata?.call_duration_secs??null,suggestions:[],reviewRequired:true})),
  ...(outcome==='do_not_call'?[
   db().prepare("UPDATE requests SET consents=json_set(consents,'$.aiCall',json('false'),'$.contactSuppressed',json('true'),'$.marketing',json('false'),'$.whatsapp',json('false')) WHERE id=?").bind(row.id),
   db().prepare("UPDATE actions SET status='cancelled' WHERE request_id=? AND kind IN ('voice_callback','followup_call') AND status='queued'").bind(row.id),
   db().prepare("UPDATE email_outbox SET status='cancelled',updated_at=? WHERE request_id=? AND status='queued' AND kind LIKE 'sales_followup:%'").bind(now,row.id)
  ]:[])
 ]);
 return json({ok:true,reviewRequired:true});
}
