export type MailConfig={POSTMARK_SERVER_TOKEN?:string;MAIL_FROM?:string;MAIL_REPLY_TO?:string;MAIL_NOTIFICATION_TO?:string;MAIL_BCC?:string;EMAIL_ENABLED?:string};
const address=(v:string|undefined)=>!!v&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(v)&&v.length<=254;
export function mailConfigured(e:MailConfig){return e.EMAIL_ENABLED==="true"&&!!e.POSTMARK_SERVER_TOKEN&&e.POSTMARK_SERVER_TOKEN!=="POSTMARK_API_TEST"&&address(e.MAIL_FROM?.match(/<([^<>]+)>$/)?.[1]||e.MAIL_FROM)&&address(e.MAIL_NOTIFICATION_TO)&&(!e.MAIL_REPLY_TO||address(e.MAIL_REPLY_TO));}
export type MailAttachment={Name:string;Content:string;ContentType:"application/pdf"};
export async function sendTransactional(e:MailConfig,to:string,subject:string,text:string,messageId:string,attachments:MailAttachment[]=[],html?:string){
 if(!mailConfigured(e)||!address(to))return {status:"blocked",error:"mail_not_configured"} as const;
 if(attachments.length>10||attachments.reduce((n,a)=>n+a.Content.length,0)>8*1024*1024)return {status:"blocked",error:"attachments_too_large"} as const;
 try{
 const response=await fetch("https://api.postmarkapp.com/email",{method:"POST",redirect:"error",signal:AbortSignal.timeout(8000),headers:{"X-Postmark-Server-Token":e.POSTMARK_SERVER_TOKEN!,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({From:e.MAIL_FROM,To:to,...(address(e.MAIL_BCC)?{Bcc:e.MAIL_BCC}:{}),ReplyTo:e.MAIL_REPLY_TO||e.MAIL_FROM,Subject:subject,TextBody:text,...(html?{HtmlBody:html}:{}),MessageStream:"outbound",TrackOpens:false,TrackLinks:"None",Attachments:attachments,Metadata:{factuurscan_message_id:messageId}})});
 if(response.status===429)return {status:"queued",error:"provider_rate_limited"} as const;
 // A timeout or a server error may happen after acceptance: reconcile before resending.
 if(response.status>=500)return {status:"needs_review",error:"provider_result_unknown"} as const;
 const body=await response.json() as {ErrorCode?:number;MessageID?:string};
 if(response.ok&&body.ErrorCode===0&&typeof body.MessageID==="string"&&body.MessageID)return {status:"accepted",providerId:body.MessageID} as const;
 return {status:"failed",error:`provider_rejected_${response.status}_${Number(body.ErrorCode)||0}`} as const;
 }catch{return {status:"needs_review",error:"provider_result_unknown"} as const;}
}
