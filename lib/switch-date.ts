/** Scheduling policy, not a statement about every supplier's termination terms. */
export function suggestedSwitchDate(now=new Date()){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now),n=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
 const earliest=new Date(Date.UTC(n("year"),n("month")-1,n("day")+30));
 const first=new Date(Date.UTC(earliest.getUTCFullYear(),earliest.getUTCMonth()+(earliest.getUTCDate()===1?0:1),1));
 return first.toISOString().slice(0,10);
}
export function switchDateIssue(value:string,now=new Date()){return (!value||!/^\d{4}-\d{2}-01$/.test(value)||value<suggestedSwitchDate(now))?"Kies de eerste dag van een maand, minstens 30 dagen vooruit.":"";}
/** Display dates in Belgian day/month/year order; storage remains ISO. */
export function belgianDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const parsed=new Date(value+"T00:00:00Z");return Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==value?value:`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`;}
export function parseBelgianDate(value:string){const match=value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!match)return "";const iso=`${match[3]}-${match[2]}-${match[1]}`;return belgianDate(iso)===value.trim()?iso:"";}
