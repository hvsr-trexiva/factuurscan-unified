import {db,StoredRequest,token} from "./server";
export type Workflow={request_id:string;state:string;version:number;proposal:string;gates:string;pandadoc_id:string|null;sent_at:string|null;followup_at:string|null;signed_at:string|null;supplier_receipt:string|null;paused:number;updated_at:string};
export const gateNames=["currentTariffVerified","offerVerified","templateComplete","templateCurrent","supplierAcceptsSigning","signerAuthorityChecked","mandatoryFieldsComplete","priceCalculationReviewed"] as const;
export function ready(gates:Record<string,boolean>){return gateNames.every(k=>gates[k]===true);}
export function callWindow(now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",weekday:"short",hour:"2-digit",hourCycle:"h23"}).formatToParts(now).map(x=>[x.type,x.value]));return !["Sat","Sun"].includes(p.weekday)&&Number(p.hour)>=9&&Number(p.hour)<17;}
export async function action(kind:string,id:string,version:number,due=new Date().toISOString()){const key=`${kind}:${id}:${version}`;await db().prepare("INSERT OR IGNORE INTO actions (id,request_id,kind,status,due_at,payload) VALUES (?,?,?,'queued',?,?)").bind(key,id,kind,due,JSON.stringify({version})).run();}
export async function getWorkflow(id:string){return db().prepare("SELECT * FROM workflows WHERE request_id=?").bind(id).first<Workflow>();}
