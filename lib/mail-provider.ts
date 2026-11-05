export type MailConfig={POSTMARK_SERVER_TOKEN?:string;MAIL_FROM?:string;MAIL_REPLY_TO?:string;MAIL_NOTIFICATION_TO?:string;MAIL_BCC?:string;EMAIL_ENABLED?:string};
const address=(v:string|undefined)=>!!v&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(v)&&v.length<=254;
const senderAddress=(e:MailConfig)=>e.MAIL_FROM?.match(/<([^<>]+)>$/)?.[1]||e.MAIL_FROM;
export function mailReadiness(e:MailConfig){
 const checks={EMAIL_ENABLED:e.EMAIL_ENABLED==="true",POSTMARK_SERVER_TOKEN:!!e.POSTMARK_SERVER_TOKEN&&e.POSTMARK_SERVER_TOKEN!=="POSTMARK_API_TEST",MAIL_FROM:address(senderAddress(e)),MAIL_NOTIFICATION_TO:address(e.MAIL_NOTIFICATION_TO),MAIL_REPLY_TO:!e.MAIL_REPLY_TO||address(e.MAIL_REPLY_TO)};
 return {checks,missing:Object.entries(checks).filter(([,ok])=>!ok).map(([key])=>key)};
}
export function mailConfigured(e:MailConfig){return mailReadiness(e).missing.length===0;}
export type MailAttachment={Name:string;Content:string;ContentType:"application/pdf"};
type MailResult={status:"accepted"|"queued"|"needs_review"|"failed"|"blocked";providerId?:string;error?:string};
function safeMessage(value:unknown){return String(value||"").replace(/[\r\n\t]+/g," ").replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,"[email]").slice(0,240);}
function report(id:string,result:MailResult){console.info("FS_POSTMARK_RESULT",JSON.stringify({messageId:id,status:result.status,...(result.providerId?{providerId:result.providerId}:{}),...(result.error?{error:safeMessage(result.error)}:{})}));return result;}
export async function sendTransactional(e:MailConfig,to:string,subject:string,text:string,messageId:string,attachments:MailAttachment[]=[],html?:string):Promise<MailResult>{
 if(!mailConfigured(e)||!address(to))return report(messageId,{status:"blocked",error:!mailConfigured(e)?`mail_config_missing:${mailReadiness(e).missing.join(",")}`:"invalid_recipient"});
 if(attachments.length>10||attachments.reduce((n,a)=>n+a.Content.length,0)>8*1024*1024)return report(messageId,{status:"blocked",error:"attachments_too_large"});
 try{
  const response=await fetch("https://api.postmarkapp.com/email",{method:"POST",redirect:"error",signal:AbortSignal.timeout(8000),headers:{"X-Postmark-Server-Token":e.POSTMARK_SERVER_TOKEN!,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({From:e.MAIL_FROM,To:to,...(address(e.MAIL_BCC)?{Bcc:e.MAIL_BCC}:{}),ReplyTo:e.MAIL_REPLY_TO||e.MAIL_FROM,Subject:subject,TextBody:text,...(html?{HtmlBody:html}:{}),MessageStream:"outbound",TrackOpens:false,TrackLinks:"None",Attachments:attachments,Metadata:{factuurscan_message_id:messageId}})});
  if(response.status===429)return report(messageId,{status:"queued",error:"postmark_rate_limited"});
  if(response.status>=500)return report(messageId,{status:"needs_review",error:`postmark_result_unknown_http_${response.status}`});
  const body=await response.json() as {ErrorCode?:number;MessageID?:string;Message?:string};
  if(response.ok&&body.ErrorCode===0&&typeof body.MessageID==="string"&&body.MessageID)return report(messageId,{status:"accepted",providerId:body.MessageID});
  return report(messageId,{status:"failed",error:`postmark_rejected_http_${response.status}_code_${Number(body.ErrorCode)||0}${body.Message?`_${safeMessage(body.Message)}`:""}`});
 }catch(error){const kind=error instanceof Error?error.name:"unknown";return report(messageId,{status:"needs_review",error:`postmark_request_unknown:${kind}`});}
}
