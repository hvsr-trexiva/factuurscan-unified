import raw from "@/data/own-monthly-tariffs.json";
import {ownCatalogSchema} from "@/lib/own-offers";
export async function GET(){return Response.json(ownCatalogSchema.parse(raw),{headers:{"Cache-Control":"public, max-age=60","X-Content-Type-Options":"nosniff"}});}
