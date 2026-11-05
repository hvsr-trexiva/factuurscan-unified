import {json} from "@/lib/server";import {bridgeAuthorized,claimWebsiteRequest} from "@/lib/website-bridge";
export async function POST(req:Request){if(!await bridgeAuthorized(req))return json({},401);return json({job:await claimWebsiteRequest()});}
