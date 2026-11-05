import raw from "@/data/own-monthly-tariffs.json";
import {ownCatalogSchema} from "@/lib/own-offers";
import {freshMonth} from "@/lib/business-compare";
export async function GET(){const c=ownCatalogSchema.parse(raw),ready=c.status==="approved"&&freshMonth(c.month);return Response.json({...c,products:ready?c.products.filter(p=>p.role==="offer"):[],dynamicProducts:[],mode:"own_monthly_catalog",ready},{headers:{"Cache-Control":"public, max-age=60","X-Content-Type-Options":"nosniff"}});}
