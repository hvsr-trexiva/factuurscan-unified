import {json,ownerAuthorized,sameOrigin} from "@/lib/server";import {runSales} from "@/lib/sales-automation";
export async function POST(req:Request){if(!sameOrigin(req)||!await ownerAuthorized())return json({},403);try{return json(await runSales())}catch{return json({error:"Verwerking niet beschikbaar"},503)}}
