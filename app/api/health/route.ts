import {db,bucket,json} from "@/lib/server";
export async function GET(){
 const checks=await Promise.allSettled([
 dbCheck(),storageCheck()
 ]);
 const ok=checks.every(c=>c.status==="fulfilled");
 return json({status:ok?"operational":"degraded",scope:"intake_storage",database:checks[0].status==="fulfilled",storage:checks[1].status==="fulfilled",checkedAt:new Date().toISOString()},ok?200:503);
}
async function dbCheck(){await db().prepare("SELECT id FROM requests LIMIT 0").all();await db().prepare("SELECT id FROM jobs LIMIT 0").all();await db().prepare("SELECT key FROM rate_limits LIMIT 0").all();await db().prepare("SELECT id FROM email_outbox LIMIT 0").all();}
async function storageCheck(){await bucket().list({prefix:"health-check/",limit:1});}
