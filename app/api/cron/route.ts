import {equal} from '@/lib/node-auth';
import {db,json,logEvent} from '@/lib/server';
import {runSales} from '@/lib/sales-automation';
import {analyzeStoredInvoices} from '@/lib/checkout-storage';
import {queueCheckoutProposal} from '@/lib/checkout-proposal';
export const dynamic='force-dynamic';
export async function POST(request:Request){if(!process.env.CRON_SECRET||!equal(request.headers.get('authorization')||'','Bearer '+process.env.CRON_SECRET))return json({},401);
 const now=new Date().toISOString(),lease=new Date(Date.now()+90000).toISOString();
 await db().prepare('CREATE TABLE IF NOT EXISTS node_locks(name TEXT PRIMARY KEY,until TEXT NOT NULL)').run();
 const lock=await db().prepare("INSERT INTO node_locks VALUES('cron',?) ON CONFLICT(name) DO UPDATE SET until=excluded.until WHERE node_locks.until<? RETURNING name").bind(lease,now).first();if(!lock)return json({status:'already_running'},409);
 try{const rows=await db().prepare("SELECT * FROM requests WHERE expires_at>? AND json_array_length(documents)>0 AND NOT EXISTS(SELECT 1 FROM audit WHERE request_id=requests.id AND event='node_analysis_complete') ORDER BY created_at LIMIT 3").bind(now).all<any>();const analysis=[];for(const r of rows.results){try{await analyzeStoredInvoices(r);const proposal=await queueCheckoutProposal(r.id);await logEvent('node_analysis_complete',r.id,{proposal});analysis.push({id:r.id,status:'processed',proposal});}catch(e){await logEvent('node_analysis_retry',r.id,{message:e instanceof Error?e.message:'failed'});analysis.push({id:r.id,status:'needs_configuration_or_data'});}}
 const {queueProposalFollowups}=await import('@/lib/proposal-followup');const followups=await queueProposalFollowups();return json({analysis,followups,sales:await runSales()});}finally{await db().prepare("DELETE FROM node_locks WHERE name='cron'").run();}}
