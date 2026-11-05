import type {compareOwnOffers} from "./own-offers";

type Item={energy:"electricity"|"gas";comparison:ReturnType<typeof compareOwnOffers>|null};
/** Weighted by reference energy costs, never an average of the two percentages. */
export function combinedSavings(items:Item[]){
 if(!items.length||new Set(items.map(i=>i.energy)).size!==items.length)return null;
 let current=0,offer=0;
 for(const {comparison:c} of items){
  const r=c?.rows[0];
  if(!c||!r||c.baseline===null||r.difference===null||!Number.isFinite(c.baseline)||!Number.isFinite(r.annual))return null;
  current+=Math.round(c.baseline*100);offer+=Math.round(r.annual*100);
 }
 const difference=current-offer;
 return {current:current/100,offer:offer/100,difference:difference/100,percentage:current>0?difference/current*100:null};
}
