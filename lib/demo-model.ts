export const demoCases=[
 {id:"horeca",sector:"Horeca",name:"Brasserie De Linde",city:"Gent",electricity:42000,gas:36000,currentElectricity:.22,newElectricity:.16,currentGas:.08,newGas:.065,currentFixed:240,newFixed:160,network:2350,levies:780,area:240,focus:"Koeling, keuken en openingsuren",question:"Hoeveel verbruiken de koelinstallaties buiten de openingsuren?"},
 {id:"retail",sector:"Retail",name:"Atelier Noord",city:"Antwerpen",electricity:18000,gas:12000,currentElectricity:.24,newElectricity:.17,currentGas:.085,newGas:.065,currentFixed:220,newFixed:150,network:1260,levies:410,area:160,focus:"Verlichting en winkelcomfort",question:"Kan de verlichting buiten de openingsuren automatisch worden uitgeschakeld?"},
 {id:"kantoor",sector:"Kantoor",name:"Studio Morgen",city:"Leuven",electricity:12000,gas:24000,currentElectricity:.235,newElectricity:.175,currentGas:.082,newGas:.066,currentFixed:240,newFixed:180,network:1100,levies:460,area:300,focus:"Verwarming en bezetting",question:"Volgt de verwarmingsregeling de werkelijke bezetting van het kantoor?"}
] as const;
export type DemoCase=typeof demoCases[number];
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function calculateDemo(c:DemoCase){
 const currentElectricity=round(c.electricity*c.currentElectricity),proposedElectricity=round(c.electricity*c.newElectricity),currentGas=round(c.gas*c.currentGas),proposedGas=round(c.gas*c.newGas);
 const currentEnergy=round(currentElectricity+currentGas+c.currentFixed),proposedEnergy=round(proposedElectricity+proposedGas+c.newFixed),current=round(currentEnergy+c.network+c.levies),proposed=round(proposedEnergy+c.network+c.levies),saving=round(current-proposed);
 return {currentElectricity,proposedElectricity,currentGas,proposedGas,currentEnergy,proposedEnergy,current,proposed,saving,percentage:saving/current*100,electricSaving:round(currentElectricity-proposedElectricity),gasSaving:round(currentGas-proposedGas),fixedSaving:round(c.currentFixed-c.newFixed)};
}
export const euro=(v:number,digits=0)=>new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR",minimumFractionDigits:digits,maximumFractionDigits:digits}).format(v);
export const number=(v:number)=>new Intl.NumberFormat("nl-BE").format(v);
