import {getSectors} from "@/lib/sector-data";
export async function GET(){return Response.json(await getSectors(),{headers:{"Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"}});}
