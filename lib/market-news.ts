export type NewsItem={title:string;date:string;url:string;type:string};
export const newsSource="https://www.vlaamsenutsregulator.be/elektriciteit-aardgas";
export const reviewedNews:NewsItem[]=[
 {title:"Nieuw gezamenlijk rapport over de Belgische energiemarkt",date:"2026-10-14",url:"https://www.vlaamsenutsregulator.be/publicaties/rapp-2026-17",type:"Marktrapport"},
 {title:"V-test: aangepaste kortingsregels voor gezinnen",date:"2026-10-07",url:"https://www.vlaamsenutsregulator.be/nieuws-en-persoverzicht/aanpassingen-v-testr-wet-koopkracht-energie",type:"Contracten"},
 {title:"Dienstverlening van netbeheerders onder de loep",date:"2026-10-05",url:"https://www.vlaamsenutsregulator.be/nieuws-en-persoverzicht/rapporten-kwaliteit-dienstverlening-en-de-aansprakelijkheid-van-de-netbeheerders",type:"Netbeheer"}
];
const months=["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
function plain(value:string){return value.replace(/<[^>]*>/g," ").replace(/&(?:amp|nbsp|quot|#039|lt|gt);/g,x=>({"&amp;":"&","&nbsp;":" ","&quot;":'"',"&#039;":"'","&lt;":"<","&gt;":">"}[x]||" ")).replace(/\s+/g," ").trim();}
export function parseNews(html:string){const items:NewsItem[]=[];for(const card of html.split(/<div\s+class="content-card\b/).slice(1)){
 const link=card.match(/href="(\/(?:nieuws-en-persoverzicht|publicaties)\/[^"?#]+)"/),heading=card.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/),date=plain(card).match(/\b(\d{1,2}) (januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december) (20\d{2})\b/);
 if(!link||!heading||!date)continue;
 const iso=`${date[3]}-${String(months.indexOf(date[2])+1).padStart(2,"0")}-${date[1].padStart(2,"0")}`;if(iso>new Date().toISOString().slice(0,10))continue;
 const known=reviewedNews.find(n=>n.url.endsWith(link[1]));if(link[1].startsWith("/publicaties/")&&!known)continue;const words=plain(heading[1]).split(" ");const title=known?.title||(words.slice(0,7).join(" ")+(words.length>7?"…":""));
 items.push({title,date:iso,url:new URL(link[1],newsSource).href,type:link[1].startsWith("/publicaties/")?"Publicatie":"Nieuws"});
 }return items.filter((n,i,a)=>a.findIndex(x=>x.url===n.url)===i).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);}
