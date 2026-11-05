import {DemoCase} from "./demo-model";
const profiles={horeca:[2,2,2,2,2,3,4,5,5,5,5,7,8,7,5,5,6,8,10,10,8,6,4,3],retail:[1,1,1,1,1,1,2,4,7,8,8,8,8,8,8,8,8,7,5,3,2,1,1,1],kantoor:[1,1,1,1,1,1,2,5,8,9,9,9,8,8,8,8,6,4,2,2,1,1,1,1]};
export function energyScenario(c:DemoCase,shiftPercent:number){if(!Number.isFinite(shiftPercent)||shiftPercent<0||shiftPercent>40)throw Error("Ongeldig scenario");
 const weights=profiles[c.id],total=weights.reduce((a,b)=>a+b,0),dailyKwh=c.electricity/365,baseline=weights.map(w=>w/total*dailyKwh);
 const prices=weights.map((_,i)=>i>=17&&i<=20?.24:i>=11&&i<=14?.12:.18);const peak=baseline.slice(17,21).reduce((a,b)=>a+b,0),shifted=peak*shiftPercent/100;
 const optimized=baseline.map((v,i)=>i>=17&&i<=20?v*(1-shiftPercent/100):i>=11&&i<=14?v+shifted/4:v);
 const baselineCost=baseline.reduce((a,b,i)=>a+b*prices[i],0),optimizedCost=optimized.reduce((a,b,i)=>a+b*prices[i],0);
 return {baseline,optimized,prices,dailyKwh,baselineCost,optimizedCost,shifted,dailySaving:baselineCost-optimizedCost,annualIllustration:(baselineCost-optimizedCost)*365};
}
export function invoiceSettlement(annualExVat:number){const vat= Math.round(annualExVat*.21*100)/100,total=Math.round((annualExVat+vat)*100)/100,monthlyAdvance=Math.floor(total/12/10)*10,advances=monthlyAdvance*12;return {vat,total,monthlyAdvance,advances,balance:Math.round((total-advances)*100)/100};}
