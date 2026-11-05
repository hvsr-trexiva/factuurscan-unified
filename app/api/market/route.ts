import {fetchCreg,CregMarket} from "@/lib/creg-market";
import {newsSource,parseNews,reviewedNews} from "@/lib/market-news";
type Result={items:typeof reviewedNews;mode:"source_checked"|"reviewed_selection";checkedAt:string;source:string;prices:CregMarket};
let cached:{expires:number;result:Result}|null=null;let pending:Promise<Result>|null=null;
async function refresh():Promise<Result>{const pricesPromise=fetchCreg();const checkedAt=new Date().toISOString();try{
 const response=await fetch(newsSource,{headers:{Accept:"text/html"},signal:AbortSignal.timeout(8000),redirect:"error"});if(!response.ok||Number(response.headers.get("content-length")||0)>600000)throw Error("news_http_"+response.status);
 const reader=response.body?.getReader();if(!reader)throw Error("empty_source");let size=0;const chunks:Uint8Array[]=[];while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>600000){await reader.cancel();throw Error("source_too_large");}chunks.push(r.value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 const items=parseNews(new TextDecoder().decode(bytes));if(!items.length)throw Error("no_news");return {items,mode:"source_checked",checkedAt,source:newsSource,prices:await pricesPromise};
 }catch(e){console.warn("market_news_refresh_failed",e instanceof Error?e.message:"unknown");return {items:reviewedNews,mode:"reviewed_selection",checkedAt:"2026-10-15T00:00:00Z",source:newsSource,prices:await pricesPromise};}}
export async function GET(){if(!cached||cached.expires<Date.now()){pending||=refresh();try{cached={result:await pending,expires:Date.now()+3600000};}finally{pending=null;}}return Response.json(cached.result,{headers:{"Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"}});}
