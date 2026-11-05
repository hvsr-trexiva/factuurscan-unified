import {json} from "@/lib/server";import {bridgeAuthorized,bridgeFile} from "@/lib/website-bridge";
export async function GET(req:Request){if(!await bridgeAuthorized(req))return json({},401);return bridgeFile(req);}
