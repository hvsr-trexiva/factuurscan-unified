import {belgianDate} from "./switch-date";
import {emptyEnergy,contractScope} from "./energy-case";
import catalog from "@/data/own-monthly-tariffs.json";
import {compareOwnOffers} from "./own-offers";
import {initialCheckout} from "./checkout-profile";
import {bucket,db,hash,runtime} from "./server";
import {mailConfigured} from "./mail-provider";
import {PDFDocument,PDFName,PDFString,PDFSignature,rgb} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fontData from "./fonts/dejavu-sans";
import {proposalMail} from "./proposal-presentation";
const eur=(n:number)=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR"}).format(n);
export function checkoutQuote(payload:Record<string,any>){
 const p=initialCheckout(payload),rows:any[]=[],missing:string[]=[];
 for(const l of p.locations){const company=p.enterprises.find(e=>e.id===l.enterpriseId)?.name||"Uw bedrijf";
  for(const energy of ["electricity","gas"] as const){if(l.currentType==="dynamic"){if(energy==="electricity")missing.push(`${company} / ${l.label||"locatie"}: dynamisch contract vereist een persoonlijke profielcontrole`);continue;}const kwh=energy==="electricity"?l.electricityTotal:l.gasKwh;if(!kwh){if(energy==="electricity"?l.electricityEan:l.gasEan)missing.push(`${company} / ${l.label||l.address||"locatie"}: jaarverbruik ${energy==="gas"?"gas":"elektriciteit"}`);continue;}
   try{const result=compareOwnOffers({supplier:l.currentSupplier,contractType:l.currentType==="fixed"?"fixed":l.currentType==="variable"?"variable":"unknown",energy,meter:"single",dayKwh:kwh,nightKwh:0,invoiceAnnual:null,invoiceBasisConfirmed:false,monthlyAdvance:null,annualOtherCosts:null,vatPercent:null},catalog),best=result.rows[0];if(result.baseline===null||best.difference===null)throw Error();rows.push({company,location:l.label||l.address||"Locatie",energy,kwh,current:result.baseline,offer:best.annual,difference:best.difference,percentage:best.percentage,supplier:best.tariff.supplier,product:best.tariff.product,reference:result.referenceTariff?.product,referenceType:result.referenceType,currentSupplier:l.currentSupplier,referenceUnitCents:result.referenceTariff?.singleCents,offerUnitCents:best.tariff.singleCents,offerType:best.tariff.type})}catch{missing.push(`${company} / ${l.label||"locatie"}: passende maandtabelvergelijking`);}
  }
 }
 let basis="Controleer de voorgestelde aansluitingsgegevens. Jaarverbruiken zijn klantinvoer of nog te bevestigen factuursuggesties.";
 if(p.locations.some(l=>[l.electricitySource,l.gasSource].some(s=>["area_scenario","band_scenario"].includes(s))))basis+=" Een deel van het verbruik is een band- of oppervlaktescenario, geen gemeten jaarverbruik.";
 if(p.locations.some(l=>l.register!=="single"&&l.register!=="unknown"||l.solar===true))basis+=" Enkelvoudige tabelprijs op totale netafname; geen specifieke registertarieven of injectievergoeding.";
 if(!rows.length){basis="Scenario op de eerder ingevulde verbruiken. Deze cijfers zijn nog niet als jaarverbruik uit uw factuur bevestigd.";for(const b of payload.comparisonsSnapshot||[]){const r=b.comparison?.rows?.[0];if(!r||r.difference===null||b.comparison.baseline===null)continue;rows.push({company:payload.company||"Uw bedrijf",location:"Ingevuld scenario",energy:b.energy,kwh:b.input.annualKwh,current:b.comparison.baseline,offer:r.annual,difference:r.difference,percentage:r.percentage,supplier:r.tariff.supplier,product:r.tariff.product,reference:b.comparison.referenceTariff?.product,referenceType:b.comparison.referenceType,currentSupplier:b.input.supplier,referenceUnitCents:b.comparison.referenceTariff?.singleCents,offerUnitCents:r.tariff.singleCents,offerType:r.tariff.type})}}
 const current=rows.reduce((n,r)=>n+Math.round(r.current*100),0)/100,offer=rows.reduce((n,r)=>n+Math.round(r.offer*100),0)/100,difference=Math.round((current-offer)*100)/100;
 return {month:catalog.month,rows,missing,basis,current,offer,difference,percentage:current>0?difference/current*100:null,complete:rows.length>0&&!missing.length};
}
export async function proposalPdf(payload:Record<string,any>,reference:string,continueLink?:string,options:{example?:boolean;documents?:{title:string;bytes:Uint8Array}[]}={}){
 const q=checkoutQuote(payload);if(!q.rows.length)throw Error("Vul leverancier en jaarverbruik in om een voorstel te maken.");
 const profile=initialCheckout(payload),pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(Uint8Array.from(atob(fontData),c=>c.charCodeAt(0)),{subset:true});
 const ink=rgb(.13,.24,.2),muted=rgb(.35,.41,.36),lime=rgb(.88,.95,.75),pale=rgb(.96,.97,.94),white=rgb(1,1,1),pages:any[]=[];let page:any,y=0;
 function start(title:string){page=pdf.addPage([595,842]);pages.push(page);page.drawRectangle({x:0,y:760,width:595,height:82,color:ink});page.drawText("factuurscan.be",{x:42,y:801,size:16,font,color:white});page.drawText(title,{x:42,y:777,size:10,font,color:lime});y=733;}
 function text(s:string,x=42,size=10,color=ink,width=510){let line="";for(const word of String(s).split(/\s+/)){if(font.widthOfTextAtSize(line+(line?" ":"")+word,size)>width&&line){draw(line);line=word}else line+=(line?" ":"")+word}if(line)draw(line);function draw(t:string){if(y<65){start("Uw energievoorstel - vervolg")}page.drawText(t,{x,y,size,font,color});y-=size*1.48;}y-=4;}
 function rule(){page.drawLine({start:{x:42,y},end:{x:553,y},thickness:.6,color:rgb(.80,.85,.77)});y-=16;}
 function link(label:string,url:string){const u=new URL(url);if(!["https:","http:"].includes(u.protocol))throw Error("Ongeldige dossierlink");if(y<115)start("Uw volgende stap");page.drawRectangle({x:42,y:y-38,width:511,height:42,color:ink});page.drawText(label,{x:56,y:y-22,size:11,font,color:white});const a=pdf.context.register(pdf.context.obj({Type:"Annot",Subtype:"Link",Rect:[42,y-38,553,y+4],Border:[0,0,0],A:{Type:"Action",S:"URI",URI:PDFString.of(u.href)}}));const existing=page.node.get(PDFName.of("Annots"));if(existing)existing.push(a);else page.node.set(PDFName.of("Annots"),pdf.context.obj([a]));y-=57;}
 start("UW PERSOONLIJKE ENERGIEVERGELIJKING");
 if(options.example)text("VOORBEELD - fictieve klantgegevens, geen echte klantfactuur of contract",42,9,muted);
 text(payload.company==="Nog te bevestigen"?"Uw onderneming":payload.company||profile.enterprises[0]?.name||"Uw onderneming",42,17);text(`Dossier ${reference}  |  Tariefmaand ${q.month}`,42,9,muted);y-=8;
 const positive=q.difference>0;page.drawRectangle({x:42,y:y-112,width:511,height:120,color:positive?lime:pale});const cardTop=y;page.drawText(positive?"UW MOGELIJKE ENERGIEVOORDEEL":"UW BEREKENDE ENERGIEVERSCHIL",{x:58,y:cardTop-14,size:9,font,color:ink});page.drawText(`${eur(Math.abs(q.difference))} ${q.difference<0?"hoger":"lager"} per jaar`,{x:58,y:cardTop-52,size:28,font,color:ink});page.drawText(`${q.percentage===null?"Percentage niet beschikbaar":Math.abs(q.percentage).toFixed(2).replace(".",",")+"%"}  |  ${eur(Math.abs(q.difference)/12)} ${q.difference<0?"hoger":"lager"} per maand`,{x:58,y:cardTop-84,size:11,font,color:ink});y=cardTop-135;
 text("Schatting op verbruikte energie excl. btw; geen besparing op uw volledige factuur.",42,9,muted);text(`Referentie: ${eur(q.current)}/jaar    Ons aanbod: ${eur(q.offer)}/jaar`,42,11);rule();
 for(const r of q.rows){if(y<235)start("UW TARIEVEN NAAST ELKAAR");text((r.energy==="gas"?"AARDGAS":"ELEKTRICITEIT")+`  |  ${r.kwh.toLocaleString("nl-BE")} kWh/jaar`,42,12);text(`${r.company} - ${r.location}`,42,9,muted);text(`Referentie: ${r.currentSupplier} ${r.reference||""} (${r.referenceType==="fixed"?"vast":"variabel"})`,42,9);text(`${r.referenceUnitCents?.toLocaleString("nl-BE",{maximumFractionDigits:4})||"-"} cEUR/kWh  |  ${eur(r.current)}/jaar`,42,10,muted);text(`Ons voorstel: ${r.supplier} ${r.product} (${r.offerType==="fixed"?"vast":"variabel"})`,42,10);text(`${r.offerUnitCents?.toLocaleString("nl-BE",{maximumFractionDigits:4})||"-"} cEUR/kWh  |  ${eur(r.offer)}/jaar`,42,10);text(`${eur(Math.abs(r.difference))} ${r.difference<0?"duurder":"lager"} per jaar  |  ${Math.abs(r.percentage||0).toFixed(2).replace(".",",")}%`,42,12);rule();}
 if(continueLink)link(options.example?"Bekijk de overstapmogelijkheden (voorbeeld) →":"Akkoord? Bekijk en onderteken mijn documenten →",continueLink);
 start("UW GEGEVENS EN VOLGENDE STAPPEN");if(options.example)text("VOORBEELDDOSSIER - fictieve klantgegevens",42,9,muted);text("Alles samen in uw energiedossier.",42,19);text(`Referentie: ${reference}  |  Tariefmaand: ${q.month}`,42,9,muted);text(`Contactpersoon: ${profile.name||payload.name||"Nog aan te vullen"}`,42,10);if(payload.email)text(`E-mail: ${payload.email}`,42,9,muted);if(payload.phone)text(`Telefoon: ${payload.phone}`,42,9,muted);for(const e of profile.enterprises){text(`Onderneming: ${e.name||"Nog aan te vullen"}`,42,10);if(e.companyNumber)text(`Ondernemingsnummer: ${e.companyNumber}`,42,9,muted);text(`Facturatieadres: ${e.billingAddress||"Nog te bevestigen"}`,42,9,muted);}
 for(const l of profile.locations){text(`Leveringsadres: ${l.address||"Nog te bevestigen"}`,42,10);if(l.electricityEan)text(`EAN elektriciteit: ${l.electricityEan}`,42,9,muted);if(l.gasEan)text(`EAN gas: ${l.gasEan}`,42,9,muted);}
 text(`Voorgestelde startdatum: ${belgianDate(profile.desiredStart)||"Nog te bepalen"}`,42,10);rule();
 text("Zo gaat u verder",42,14);for(const s of ["1. Controleer de overgenomen gegevens en vul ontbrekende informatie aan.","2. Lees het beschikbare leverancierscontract, de tariefkaart en de bijlagen.","3. Onderteken de vrijgegeven documenten afzonderlijk in uw persoonlijke dossier.","4. Volg de status en leveranciersbevestiging via dezelfde dossierlink."])text(s,42,10);
 if(continueLink)link(options.example?"Bekijk de website (geen echt testcontract) →":"Akkoord - open mijn documenten en teken digitaal →",continueLink);
 text("Prijzen zijn indicatief en kunnen afwijken afhankelijk van uw verbruik en uw huidige tariefformules.",42,9,muted);
 if(options.documents?.length){text("Uw documenten in dit PDF-pakket",42,12);for(const doc of options.documents)text(doc.title,42,9);text("Open uw persoonlijke dossier via de knop hierboven om de vrijgegeven documenten afzonderlijk digitaal te ondertekenen.",42,9,muted);}
 for(const m of q.missing)text("Nog aan te vullen: "+m,42,9,muted);
 for(const doc of options.documents||[]){const source=await PDFDocument.load(doc.bytes);if(source.getPageCount()>40||pdf.getPageCount()+source.getPageCount()>60)throw Error("Te veel pagina's in het voorstelpakket");const form=source.getForm();if(form.getFields().some(f=>f instanceof PDFSignature&&f.acroField.dict.has(PDFName.of("V"))))throw Error("Een reeds ondertekend document wordt niet samengevoegd");if(form.getFields().length)form.flatten({updateFieldAppearances:false});const copied=await pdf.copyPages(source,source.getPageIndices());for(const p of copied)pdf.addPage(p);}

 for(let i=0;i<pages.length;i++){pages[i].drawLine({start:{x:42,y:48},end:{x:553,y:48},thickness:.5,color:rgb(.80,.85,.77)});pages[i].drawText(`FactuurScan | ${reference}${options.example?" | VOORBEELD":""} | ${i+1}/${pdf.getPageCount()}`,{x:42,y:31,size:8,font,color:muted});}return pdf.save();
}
export async function queueCheckoutProposal(id:string,explicit=false){
 const row=await db().prepare("SELECT payload,consents,reference,documents FROM requests WHERE id=? AND expires_at>?").bind(id,new Date().toISOString()).first<{payload:string;consents:string;reference:string;documents:string}>();if(!row)throw Error("Dossier niet beschikbaar");const p=JSON.parse(row.payload),c=JSON.parse(row.consents);if(c.salesPaused||c.service?.revokedAt||!c.emailProposal)throw Error("Geen toestemming voor een voorstel per e-mail");
 if(c.contactSuppressed)return {ok:false,status:"blocked",configured:mailConfigured(runtime()),message:"Dit e-mailadres is geblokkeerd voor verzending. Vraag hulp om het contactadres te controleren."};
 const q=checkoutQuote(p);if(!q.rows.length)return {ok:false,status:"data_required",message:"Vul leverancier en jaarverbruik in om een voorstel te maken."};
 const mailDocuments=await proposalDocuments(id,p);
 const digest=await hash(JSON.stringify({q,mailDocuments,profile:p.checkoutProfile||null,documents:JSON.parse(row.documents).map((d:any)=>d.sha256||d.key)})),kind="invoice_proposal:"+digest,mailId=id+":"+kind,now=new Date().toISOString();
 const {unprotectLink}=await import("./sales-automation");const continueLink=(await unprotectLink(p.continueCipher)).replace("/aanleveren#","/overstap-afronden#");const bytes=await proposalPacketPdf(p,row.reference,continueLink,mailDocuments),key=`proposals/${id}/${digest}.pdf`;await bucket().put(key,bytes,{httpMetadata:{contentType:"application/pdf"}});
 const mailScopeHash=await hash(JSON.stringify({profile:p.checkoutProfile||null,confirmation:p.checkoutConfirmed?.scopeHash||null}));
 const pdfSha256=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new Uint8Array(bytes).buffer))).map(b=>b.toString(16).padStart(2,"0")).join("");
 await bucket().put(`proposals/${id}/${digest}.json`,JSON.stringify({quote:q,mailDocuments,mailScopeHash,name:p.name||"",continueCipher:p.continueCipher,pdfSha256}),{httpMetadata:{contentType:"application/json"}});
 await db().prepare("UPDATE email_outbox SET status='cancelled' WHERE request_id=? AND kind LIKE 'invoice_proposal:%' AND id<>? AND status='queued'").bind(id,mailId).run();
 await db().prepare("INSERT OR IGNORE INTO email_outbox (id,request_id,kind,status,attempts,created_at,updated_at) VALUES (?,?,?,'queued',0,?,?)").bind(mailId,id,kind,now,now).run();
 const {dispatchMail}=await import("./mail");await dispatchMail(id);
 const result=await db().prepare("SELECT status FROM email_outbox WHERE id=?").bind(mailId).first<{status:string}>();return {ok:true,status:result?.status||"queued",configured:mailConfigured(runtime()),message:mailConfigured(runtime())?"Uw e-mailverzoek is verwerkt; zie de afleverstatus.":"Uw voorstel staat klaar, maar e-mailverzending moet nog worden geactiveerd."};
}
export async function checkoutProposalMail(p:Record<string,any>,reference:string,link:string,frozen?:ReturnType<typeof checkoutQuote>){
 const q=frozen||checkoutQuote(p);return proposalMail({rows:q.rows,reference,name:p.name||"",link,basis:q.basis,missing:q.missing,month:q.month});
}

export type ProposalDocument={key:string;sha256:string;filename:string;title:string};
export async function proposalDocuments(id:string,p:Record<string,any>):Promise<ProposalDocument[]>{
 const docs:ProposalDocument[]=[];
 if(p.checkoutConfirmed?.documentKey&&p.checkoutConfirmed?.documentHash)docs.push({key:p.checkoutConfirmed.documentKey,sha256:p.checkoutConfirmed.documentHash,filename:"uw-bevestigde-opdracht.pdf",title:"Uw bevestigde opdracht tot overstapvoorbereiding"});
 const energyHash=await hash(JSON.stringify(contractScope(emptyEnergy(p)))),q=checkoutQuote(p),prepared=await db().prepare("SELECT key,sha256,metadata FROM artifacts WHERE request_id=? AND kind='case_document'").bind(id).all<{key:string;sha256:string;metadata:string}>();
 for(const doc of prepared.results){const m=JSON.parse(doc.metadata);if(m.kind==="supplier_contract"&&m.state==="ready"&&m.reviewedAt&&m.energyHash===energyHash&&m.signerEmail===p.email&&q.rows.some(r=>r.supplier===m.supplier&&r.product===m.product)&&(!m.validUntil||Date.parse(m.validUntil)>Date.now()))docs.push({key:doc.key,sha256:doc.sha256,filename:"uw-leverancierscontract.pdf",title:`Uw ingevulde leverancierscontract: ${m.supplier} ${m.product}`});}
 return docs;
}
export async function proposalPacketPdf(p:Record<string,any>,reference:string,link:string,documents:ProposalDocument[]){
 const attachments:{title:string;bytes:Uint8Array}[]=[];
 for(const doc of documents){const file=await bucket().get(doc.key);if(!file||file.size>5*1024*1024)throw Error("Contractdocument niet beschikbaar");const bytes=new Uint8Array(await file.arrayBuffer()),digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new Uint8Array(bytes).buffer))).map(x=>x.toString(16).padStart(2,"0")).join("");if(digest!==doc.sha256)throw Error("Contractdocument gewijzigd; controle vereist");attachments.push({title:doc.title,bytes});}
 return proposalPdf(p,reference,documents.some(d=>d.filename==="uw-leverancierscontract.pdf")?link.replace("/overstap-afronden#","/rapport#"):link,{documents:attachments});
}
