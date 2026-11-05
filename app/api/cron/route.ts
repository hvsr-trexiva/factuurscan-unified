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
 try{await logEvent('automation_cron_started',null,{startedAt:now});const rows=await db().prepare("SELECT * FROM requests WHERE expires_at>? AND json_array_length(documents)>0 AND NOT EXISTS(SELECT 1 FROM audit WHERE request_id=requests.id AND event='node_analysis_complete') ORDER BY created_at LIMIT 3").bind(now).all<any>();const analysis=[];for(const r of rows.results){try{await analyzeStoredInvoices(r);const proposal=await queueCheckoutProposal(r.id);await logEvent('node_analysis_complete',r.id,{proposal});analysis.push({id:r.id,status:'processed',proposal});}catch(e){await logEvent('node_analysis_retry',r.id,{message:e instanceof Error?e.message:'failed'});analysis.push({id:r.id,status:'needs_configuration_or_data'});}}
 const {queueProposalFollowups}=await import('@/lib/proposal-followup');const followups=await queueProposalFollowups(),sales=await runSales(),result={analysis,followups,sales};await logEvent('automation_cron_completed',null,{analysisCount:analysis.length,followups,sales});return json(result);}catch(error){const reason=error instanceof Error?error.message:'unknown';console.error('FS_CRON_FAILED',reason);try{await logEvent('automation_cron_failed',null,{reason:reason.slice(0,240)})}catch{}return json({error:'Scheduled processing failed'},500);}finally{await db().prepare("DELETE FROM node_locks WHERE name='cron'").run();}}
