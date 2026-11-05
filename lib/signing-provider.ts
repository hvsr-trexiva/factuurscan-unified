const base="https://api.pandadoc.com/public/v1/documents";
export async function signingRequest(key:string,path:string,body?:unknown){
 const response=await fetch(base+path,{method:body?"POST":"GET",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:`API-Key ${key}`,Accept:"application/json",...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok)throw Error("signing_provider_unavailable");return response.json() as Promise<{id:string;status?:string;recipients?:{email:string;has_completed?:boolean}[];metadata?:Record<string,string>}>;
}
export function sessionUrl(id:string){if(!/^[a-zA-Z0-9_-]{5,200}$/.test(id))throw Error("invalid_session");return `https://app.pandadoc.com/s/${id}`;}
