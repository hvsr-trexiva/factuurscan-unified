import {publicOrigin} from "@/lib/request-origin";
import {situationSchema} from "@/lib/energy-situation";
import {z} from "zod";
import ownCatalog from "@/data/own-monthly-tariffs.json";
import {simpleEnergySchema,simpleEnergyComparison} from "@/lib/simple-energy";
import {boundedBody,db,hash,json,logEvent,rateLimit,recordRequest,runtime,sameOrigin,validId} from "@/lib/server";
import {phoneSchema} from "@/lib/validation";
import {protectLink} from "@/lib/sales-automation";
import {privateCase} from "@/lib/private-case";
import {requestAttribution} from "@/lib/attribution";
import {action} from "@/lib/workflow";
import {queueVoice,dispatchVoice} from "@/lib/voice-queue";
const input=z.object({id:z.string().uuid(),name:z.string().trim().max(120).default(""),email:z.string().trim().email().max(254),phone:phoneSchema.refine(p=>p.length>0),energy:simpleEnergySchema.optional(),energies:z.array(simpleEnergySchema).min(1).max(2).refine(a=>new Set(a.map(p=>p.energy)).size===a.length).optional(),privacy:z.literal(true),emailProposal:z.boolean(),followupEmail:z.boolean(),callback:z.boolean(),aiCall:z.boolean(),companyWebsite:z.literal("")}).strict().refine(p=>!!p.energy!==!!p.energies,"Kies elektriciteit, gas of beide.");

export async function POST(req:Request){
 if(!sameOrigin(req))return json({},403);
 if(!req.headers.get("content-type")?.startsWith("application/json"))return json({},415);
 try{
  const p=input.parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,8000)))),key=req.headers.get("x-receipt-token")||"";
  if(!validId(p.id)||!/^[a-f0-9]{64}$/.test(key))return json({error:"Vernieuw het formulier."},400);
  const existing=await db().prepare("SELECT reference,access_hash,payload FROM requests WHERE id=?").bind(p.id).first<{reference:string;access_hash:string;payload:string}>();
  if(existing)return await hash(key)===existing.access_hash?json({id:p.id,reference:existing.reference,duplicate:true,comparison:JSON.parse(existing.payload).comparisonSnapshot||null,comparisons:JSON.parse(existing.payload).comparisonsSnapshot||[],mailStatus:await mailStatus(p.id)}):json({},409);
  if(!runtime().RATE_LIMIT_SECRET)return json({error:"Uw aanvraag kan tijdelijk niet veilig worden opgeslagen. Probeer later opnieuw."},503);
  if(!await rateLimit(req,"offer_lead",6))return json({error:"Te veel aanvragen. Probeer later opnieuw."},429);
  const inputs=[...(p.energies||[p.energy!])].sort((a,b)=>a.energy===b.energy?0:a.energy==="electricity"?-1:1),primary=inputs.find(p=>p.energy==="electricity")||inputs[0];
  const comparisons=inputs.map(energy=>{let comparison=null;try{comparison=simpleEnergyComparison(energy,ownCatalog)}catch{}return {energy:energy.energy,input:energy,comparison}});
  const comparison=comparisons.find(r=>r.energy===primary.energy)!.comparison,now=new Date().toISOString();
  const offers=comparisons.flatMap(c=>{const r=c.comparison?.rows[0];return r?[{energy:c.energy,supplier:r.tariff.supplier,product:r.tariff.product,tariffId:r.tariff.id,annual:r.annual,difference:r.difference,percentage:r.percentage,source:c.comparison!.source,month:c.comparison!.month,energyOnly:c.comparison!.energyOnly,unitCents:r.tariff.singleCents,referenceUnitCents:c.comparison!.referenceTariff?.singleCents??null,referenceType:c.comparison!.referenceType}]:[]});
  const payload={name:p.name,company:"Nog te bevestigen",email:p.email,phone:p.phone,sector:"overig",attribution:requestAttribution(req),energyInput:primary,energyInputs:inputs,
   energy:{notes:inputs.filter(p=>p.volumeBand||p.advanceBand).map(p=>`${p.energy}: bandscenario, ${p.annualKwh} kWh/jaar en ${p.monthlyAdvance} EUR/maand. Eerst bevestigen met factuur; geen gemeten waarden.`).join("\n"),sites:[{...situationSchema.parse(inputs.find(p=>p.energy==="electricity")?.situation||primary.situation||{}),electricitySource:inputs.find(p=>p.energy==="electricity")?.areaScenario?"area_scenario":inputs.find(p=>p.energy==="electricity")?.volumeBand?"band_scenario":"customer",gasSource:inputs.find(p=>p.energy==="gas")?.areaScenario?"area_scenario":inputs.find(p=>p.energy==="gas")?.volumeBand?"band_scenario":"customer",consumptionSource:inputs.some(p=>p.areaScenario)?"area_scenario":"customer",currentSupplier:primary.supplier,currentType:primary.contractType,electricityTotal:inputs.find(p=>p.energy==="electricity")?.annualKwh??null,gasKwh:inputs.find(p=>p.energy==="gas")?.annualKwh??null}]},
   comparisonSnapshot:comparison,comparisonsSnapshot:comparisons,offerProposal:offers.find(o=>o.energy===primary.energy)||null,offerProposals:offers,
   continueCipher:await protectLink(`${publicOrigin(req)}/aanleveren#${p.id}:${key}`),funnel:{stage:"comparison_saved",lastActivityAt:now,callbackRequested:p.callback}};
  await recordRequest(p.id,"sales_lead",payload,[],{acknowledged:true,analysisRequested:true,emailProposal:p.emailProposal,followupEmail:p.followupEmail,callbackRequested:p.callback,aiCall:p.aiCall,marketing:false,whatsapp:false,funnelRecovery:true,followupUntil:new Date(Date.now()+7*86400000).toISOString(),consentEvidence:{version:"FS-OFFER-2026-10-21",at:now,sourceUrl:new URL("/energie-vergelijken",req.url).href,text:"Energievergelijking en voorstel per e-mail aangevraagd via de verzendknop. Eventuele herinnering en beltoestemmingen zijn hieronder afzonderlijk vastgelegd.",emailProposal:p.emailProposal,followupEmail:p.followupEmail,callback:p.callback,aiCall:p.aiCall}},key,false);
  if(p.callback)await action("human_callback",p.id,1,now);
  await logEvent("offer_lead_saved",p.id,{priced:offers.length>0,emailProposal:p.emailProposal,followupEmail:p.followupEmail,callback:p.callback,aiCall:p.aiCall});
  return json({id:p.id,reference:`FS-${p.id.slice(0,8).toUpperCase()}`,comparison,comparisons,mailStatus:await mailStatus(p.id)},201);
 }catch{return json({error:"Controleer uw e-mail, telefoon, leverancier, voorschot en jaarverbruik."},400);}
}
async function mailStatus(id:string){return (await db().prepare("SELECT status FROM email_outbox WHERE request_id=? AND kind='customer_receipt'").bind(id).first<{status:string}>())?.status||"not_requested";}
export async function PATCH(req:Request){
 if(!sameOrigin(req))return json({},403);
 try{const p=z.object({id:z.string().uuid(),action:z.enum(["active","upload_started","call_now","select_offer","update_energies"]),tariffId:z.string().min(1).max(200).optional(),energies:z.array(simpleEnergySchema).min(1).max(2).refine(a=>new Set(a.map(e=>e.energy)).size===a.length).optional()}).strict().parse(JSON.parse(new TextDecoder().decode(await boundedBody(req,8000))));
  const row=await privateCase(req,p.id);if(!row)return json({},403);
  if(!await rateLimit(req,"offer_activity",180))return json({},429);
  const c=JSON.parse(row.consents),payload=JSON.parse(row.payload);
  if(c.salesPaused||c.contactSuppressed||c.service?.revokedAt)return json({},409);
  if(p.action==="call_now"&&!c.aiCall)return json({error:"Kies eerst afzonderlijk toestemming voor een AI-terugbelgesprek."},409);
  if(p.action==="update_energies"){
   if(row.kind!=="sales_lead"||JSON.parse(row.documents).length)return json({error:"Uw dossier is al in behandeling. Vraag hulp om uw vergelijking te wijzigen."},409);
   if(!p.energies)return json({error:"Vul minstens één energietype in."},400);
   const inputs=[...p.energies].sort((a,b)=>a.energy===b.energy?0:a.energy==="electricity"?-1:1);
   const comparisons=inputs.map(energy=>({energy:energy.energy,input:energy,comparison:simpleEnergyComparison(energy,ownCatalog)}));
   if(comparisons.some(c=>c.comparison.baseline===null))return json({error:"Een vergelijkbaar referentietarief ontbreekt."},409);
   const previous=payload.energyInputs||[payload.energyInput],preferences:Record<string,string>={};
   const offers=comparisons.map(c=>{
    const unchanged=JSON.stringify(previous.find((i:any)=>i.energy===c.energy))===JSON.stringify(c.input);
    const chosen=unchanged&&c.comparison.rows[0]?.tariff.id===payload.offerPreferences?.[c.energy]?c.comparison.rows[0]:undefined;
    const r=chosen||c.comparison.rows[0];if(chosen)preferences[c.energy]=chosen.tariff.id;
    return {energy:c.energy,supplier:r.tariff.supplier,product:r.tariff.product,tariffId:r.tariff.id,annual:r.annual,difference:r.difference,percentage:r.percentage,source:c.comparison.source,month:c.comparison.month,energyOnly:c.comparison.energyOnly,unitCents:r.tariff.singleCents,referenceUnitCents:c.comparison.referenceTariff?.singleCents??null,referenceType:c.comparison.referenceType};
   });
   const primary=inputs[0],primaryOffer=offers[0];
   payload.energyInput=primary;payload.energyInputs=inputs;payload.comparisonsSnapshot=comparisons;payload.comparisonSnapshot=comparisons[0].comparison;
   payload.offerProposals=offers;payload.offerProposal=primaryOffer;payload.offerPreferences=preferences;payload.offerPreference=preferences[primary.energy];
   payload.energy={...payload.energy,newSupplier:preferences[primary.energy]?primaryOffer.supplier:undefined,newProduct:preferences[primary.energy]?primaryOffer.product:undefined,newType:preferences[primary.energy]?comparisons[0].comparison.rows.find(r=>r.tariff.id===primaryOffer.tariffId)?.tariff.type:undefined,
    notes:inputs.filter(i=>i.volumeBand||i.advanceBand).map(i=>`${i.energy}: bandscenario, ${i.annualKwh} kWh/jaar en ${i.monthlyAdvance} EUR/maand. Eerst bevestigen met factuur; geen gemeten waarden.`).join("\n"),
    sites:[{...payload.energy?.sites?.[0],...situationSchema.parse(inputs.find(p=>p.energy==="electricity")?.situation||primary.situation||{}),electricitySource:inputs.find(p=>p.energy==="electricity")?.areaScenario?"area_scenario":inputs.find(p=>p.energy==="electricity")?.volumeBand?"band_scenario":"customer",gasSource:inputs.find(p=>p.energy==="gas")?.areaScenario?"area_scenario":inputs.find(p=>p.energy==="gas")?.volumeBand?"band_scenario":"customer",consumptionSource:inputs.some(p=>p.areaScenario)?"area_scenario":"customer",currentSupplier:primary.supplier,currentType:primary.contractType,electricityTotal:inputs.find(i=>i.energy==="electricity")?.annualKwh??null,gasKwh:inputs.find(i=>i.energy==="gas")?.annualKwh??null}]};
  }
  if(p.action==="select_offer"){
   if(row.kind!=="sales_lead")return json({error:"Uw dossier is al in behandeling. Vraag hulp om uw keuze te wijzigen."},409);
   const tariff=ownCatalog.products.find((t:any)=>t.id===p.tariffId) as {energy:string}|undefined;
   const energyInput=(payload.energyInputs||[payload.energyInput]).find((e:any)=>e.energy===tariff?.energy);
   if(!energyInput)return json({error:"Dit tarief hoort niet bij de gekozen energietypes."},409);
   const comparison=simpleEnergyComparison(energyInput,ownCatalog),r=comparison.rows.find(r=>r.tariff.id===p.tariffId);
   if(!r||r.tariff.id!==comparison.rows[0]?.tariff.id)return json({error:"Voor uw aanvraag bieden we uitsluitend het voordeligste passende voorstel aan."},409);
   const choice={energy:energyInput.energy,supplier:r.tariff.supplier,product:r.tariff.product,tariffId:r.tariff.id,annual:r.annual,difference:r.difference,percentage:r.percentage,source:comparison.source,month:comparison.month,energyOnly:comparison.energyOnly,unitCents:r.tariff.singleCents,referenceUnitCents:comparison.referenceTariff?.singleCents??null,referenceType:comparison.referenceType};
   payload.offerPreferences={...payload.offerPreferences,[energyInput.energy]:r.tariff.id};
   payload.offerProposals=[...(payload.offerProposals||[]).filter((o:any)=>o.energy!==energyInput.energy),choice];
   if(energyInput.energy===payload.energyInput.energy){payload.offerPreference=r.tariff.id;payload.offerProposal=choice;payload.energy={...payload.energy,newSupplier:r.tariff.supplier,newProduct:r.tariff.product,newType:r.tariff.type};}

  }
  payload.funnel={...payload.funnel,lastActivityAt:new Date().toISOString(),stage:p.action==="upload_started"?"upload_started":payload.funnel?.stage};
  const updated=await db().prepare("UPDATE requests SET payload=? WHERE id=? AND payload=?").bind(JSON.stringify(payload),row.id,row.payload).run();if(!updated.meta.changes)return json({error:"Uw dossier is gewijzigd; probeer uw keuze opnieuw."},409);
  if(p.action==="update_energies"){await logEvent("offer_energies_updated",row.id,{energies:payload.energyInputs.map((e:any)=>e.energy)});return json({ok:true,comparisons:payload.comparisonsSnapshot});}
  if(p.action==="call_now"){await queueVoice(row.id,new Date().toISOString());const result=await dispatchVoice(row.id);return json({ok:true,voice:result});}
  return json({ok:true});
 }catch{return json({error:"Opslaan van uw vervolgstap is mislukt."},400);}
}
