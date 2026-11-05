/** Presentation of an already calculated difference. Missing data is never 0%. */
export function savingsDisplay(difference:number|null,percentage:number|null){
 const euros=(n:number)=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
 if(difference===null||!Number.isFinite(difference))return {kind:"missing" as const,annual:"Nog niet berekenbaar",monthly:null,percent:"Nog niet berekenbaar",direction:"",label:"Huidige vergelijkbare prijs ontbreekt"};
 const direction=difference>0?"lager":difference<0?"hoger":"gelijk";
 return {kind:difference>0?"saving" as const:difference<0?"increase" as const:"equal" as const,annual:euros(Math.abs(difference)),monthly:euros(Math.abs(difference)/12),percent:percentage===null||!Number.isFinite(percentage)?"Percentage niet berekenbaar":new Intl.NumberFormat("nl-BE",{minimumFractionDigits:1,maximumFractionDigits:2}).format(Math.abs(percentage))+"%",direction,label:difference>0?"Mogelijk voordeel":difference<0?"Dit aanbod is duurder":"Geen prijsverschil"};
}
