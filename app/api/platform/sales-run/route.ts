import {json,platformAuthorized} from "@/lib/server";import {runSales} from "@/lib/sales-automation";
export async function POST(req:Request){if(!await platformAuthorized(req))return json({},401);return json(await runSales());}
