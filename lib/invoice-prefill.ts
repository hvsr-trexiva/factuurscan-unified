/** Conservative hints only. Never treat supplier footers or arbitrary emails as the customer's identity. */
export type InvoiceHint={field:"company"|"enterprise"|"ean"|"electricityEan"|"gasEan"|"annualElectricity"|"electricityDay"|"electricityNight"|"gasKwh";value:string;evidence:string};
export function invoiceHints(raw:string):InvoiceHint[]{
 const text=raw.slice(0,250000),lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out:InvoiceHint[]=[];
 const company=lines.map(l=>l.match(/^(?:klantnaam|bedrijfsnaam|naam van de klant)\s*[:：]\s*(.{2,120})$/i)).filter(Boolean);
 if(company.length===1)out.push({field:"company",value:company[0]![1],evidence:company[0]![0]});
 const eans=Array.from(new Set(text.match(/\b54\d{16}\b/g)||[]));
 for(const value of eans){const digits=value.split("").map(Number);if((10-digits.slice(0,17).reduce((s,n,i)=>s+n*(i%2===0?3:1),0)%10)%10===digits[17])out.push({field:"ean",value,evidence:value});}
 for(const line of lines){const matches=Array.from(line.matchAll(/54\d{16}/g));if(matches.length!==1)continue;const e=matches[0][0];if(!out.some(h=>h.field==="ean"&&h.value===e))continue;if(/\b(elektriciteit|electricity|stroom)\b/i.test(line)&&!(/\b(gas|aardgas)\b/i.test(line)))out.push({field:"electricityEan",value:e,evidence:line});else if(/\b(gas|aardgas)\b/i.test(line)&&!(/\b(elektriciteit|stroom)\b/i.test(line)))out.push({field:"gasEan",value:e,evidence:line});}
 for(const [field,pattern] of [["electricityDay",/^(?:jaarafname dag|jaarverbruik dag|jaarlijkse dagafname)\s*[:：]\s*([\d. ,]+)\s*kWh$/i],["electricityNight",/^(?:jaarafname nacht|jaarverbruik nacht|jaarlijkse nachtafname)\s*[:：]\s*([\d. ,]+)\s*kWh$/i],["gasKwh",/^(?:jaarafname gas|jaarverbruik aardgas|jaarverbruik gas)\s*[:：]\s*([\d. ,]+)\s*kWh$/i]] as const){const found=lines.map(l=>({line:l,m:l.match(pattern)})).filter(x=>x.m);if(found.length!==1)continue;const raw=found[0].m![1].replace(/\s/g,""),value=raw.includes(",")?Number(raw.replace(/\./g,"").replace(",",".")):Number(/^\d{1,3}(?:\.\d{3})+$/.test(raw)?raw.replace(/\./g,""):raw);if(Number.isFinite(value)&&value>=0&&value<=1e9)out.push({field,value:String(value),evidence:found[0].line});}
 // Explicit customer VAT label avoids selecting the supplier's VAT number.
 for(const line of lines){const m=line.match(/^(?:btw[- ]?nummer klant|ondernemingsnummer klant|uw btw[- ]?nummer)\s*[:：]\s*((?:BE\s*)?\d{4}[. ]?\d{3}[. ]?\d{3})$/i);if(!m)continue;const d=m[1].replace(/\D/g,"");if(97-Number(d.slice(0,8))%97===Number(d.slice(8)))out.push({field:"enterprise",value:"BE"+d,evidence:line});}
 const annual=lines.map(l=>l.match(/^(?:jaarafname elektriciteit|jaarlijkse elektriciteitsafname|jaarverbruik elektriciteit)\s*[:：]\s*([\d. ,]+)\s*kWh$/i)).filter(Boolean);if(annual.length===1){const raw=annual[0]![1].replace(/\s/g,"");const value=raw.includes(",")?Number(raw.replace(/\./g,"").replace(",",".")):Number(/^\d{1,3}(?:\.\d{3})+$/.test(raw)?raw.replace(/\./g,""):raw);if(Number.isFinite(value)&&value>0&&value<=100000)out.push({field:"annualElectricity",value:String(value),evidence:annual[0]![0]});}
 return out;
}
export async function readInvoice(file:File){
 if(!/\.pdf$/i.test(file.name)||file.size>10*1024*1024)throw Error("Automatisch lezen werkt hier voor tekst-PDF’s tot 10 MB. Een foto of scan kan wel worden aangeleverd voor beoordeling.");
 const {getDocumentProxy,extractText}=await import("unpdf");const pdf=await getDocumentProxy(new Uint8Array(await file.arrayBuffer()),{disableFontFace:true,useSystemFonts:true});
 try{if(pdf.numPages>30)throw Error("Deze PDF telt meer dan 30 pagina’s. Lever hem aan voor beoordeling.");const {text}=await extractText(pdf,{mergePages:false});return invoiceHints(text.join("\n"));}finally{await pdf.loadingTask.destroy();}
}
