import {z} from "zod";
// This is an operator-maintained allowlist backed by written supplier acceptance.
// Never derive destinations from an uploaded invoice or customer input.
const route=z.object({supplier:z.string().min(2).max(120),product:z.string().min(2).max(160),recipient:z.string().email().max(254),templateId:z.string().min(5).max(200),signerRole:z.string().min(1).max(100),templateSha256:z.string().regex(/^[a-f0-9]{64}$/),termsSha256:z.string().regex(/^[a-f0-9]{64}$/),signingMethod:z.literal("pandadoc_electronic"),acceptanceReference:z.string().min(10).max(500),acceptanceSha256:z.string().regex(/^[a-f0-9]{64}$/),validUntil:z.string().datetime(),enabled:z.literal(true)}).strict();
export type SupplierRoute=z.infer<typeof route>;
export function supplierRoutes(raw?:string):SupplierRoute[]{try{const list=z.array(route).max(50).parse(JSON.parse(raw||"[]"));return list;}catch{return [];}}
export function acceptedRoute(raw:string|undefined,p:{supplier:string;product:string;templateId:string;signerRole:string;contractSha256:string;termsSha256:string},now=Date.now()){
 const found=supplierRoutes(raw).filter(r=>r.enabled&&Date.parse(r.validUntil)>now&&r.supplier===p.supplier&&r.product===p.product&&r.templateId===p.templateId&&r.signerRole===p.signerRole&&r.templateSha256===p.contractSha256&&r.termsSha256===p.termsSha256);
 return found.length===1?found[0]:null;
}
