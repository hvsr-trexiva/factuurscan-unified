/** Direct ElevenLabs native Twilio integration; no Render dependency. */
export type ElevenConfig={VOICE_PROVIDER?:string;VOICE_ENABLED?:string;ELEVENLABS_API_KEY?:string;ELEVENLABS_AGENT_ID?:string;ELEVENLABS_PHONE_NUMBER_ID?:string;ELEVENLABS_WEBHOOK_SECRET?:string;ELEVENLABS_PRIVACY_APPROVED?:string};
const providerId=(v:string|undefined)=>/^[a-zA-Z0-9_-]{5,160}$/.test(v||"");
export function elevenReadiness(e:ElevenConfig){return {selected:e.VOICE_PROVIDER==="elevenlabs",enabled:e.VOICE_ENABLED==="true",apiKey:!!e.ELEVENLABS_API_KEY,agent:providerId(e.ELEVENLABS_AGENT_ID),phoneNumber:providerId(e.ELEVENLABS_PHONE_NUMBER_ID),webhook:!!e.ELEVENLABS_WEBHOOK_SECRET,privacy:e.ELEVENLABS_PRIVACY_APPROVED==="true"};}
export function elevenConfigured(e:ElevenConfig){return Object.values(elevenReadiness(e)).every(Boolean);}
export async function startElevenCall(e:ElevenConfig,number:string,reference:string,requestId:string,context:Record<string,unknown>={}){
 if(!elevenConfigured(e))return {status:"blocked",error:"elevenlabs_not_configured"} as const;
 try{
  const r=await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call",{method:"POST",redirect:"error",signal:AbortSignal.timeout(15000),headers:{"xi-api-key":e.ELEVENLABS_API_KEY!,"Content-Type":"application/json"},body:JSON.stringify({agent_id:e.ELEVENLABS_AGENT_ID,agent_phone_number_id:e.ELEVENLABS_PHONE_NUMBER_ID,to_number:number,call_recording_enabled:false,conversation_initiation_client_data:{dynamic_variables:{factuurscan_request_id:requestId,factuurscan_reference:reference,customer_context:JSON.stringify(context)}}})});
  if(r.status===429)return {status:"queued",error:"voice_rate_limited"} as const;
  if(r.status>=500)return {status:"needs_review",error:"voice_result_unknown"} as const;
  if(!r.ok)return {status:"failed",error:"elevenlabs_rejected"} as const;
  const b=await r.json() as {success?:boolean;conversation_id?:string;callSid?:string};
  if(b.success===true&&providerId(b.conversation_id))return {status:"accepted",provider:"elevenlabs",callId:b.conversation_id!,...(providerId(b.callSid)?{telephonyId:b.callSid}:{})} as const;
  return {status:"needs_review",error:"voice_result_unknown"} as const;
 }catch{return {status:"needs_review",error:"voice_result_unknown"} as const;}
}
export async function verifyElevenSignature(raw:Uint8Array,header:string|null,secret:string,now=Date.now()){
 if(!header||!secret)return false;
 const parts=header.split(",").map(s=>s.trim()),ts=parts.filter(s=>s.startsWith("t="));if(ts.length!==1||!/^t=\d{10,12}$/.test(ts[0]))return false;
 const timestamp=ts[0].slice(2);if(Math.abs(now/1000-Number(timestamp))>300)return false;
 const signatures=parts.filter(s=>/^v0=[a-f0-9]{64}$/.test(s)).map(s=>s.slice(3));if(!signatures.length||signatures.length>5)return false;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]),prefix=new TextEncoder().encode(timestamp+"."),message=new Uint8Array(prefix.length+raw.length);message.set(prefix);message.set(raw,prefix.length);
 for(const sig of signatures){const bytes=Uint8Array.from(sig.match(/../g)!,h=>parseInt(h,16));if(await crypto.subtle.verify("HMAC",key,bytes,message))return true;}return false;
}
