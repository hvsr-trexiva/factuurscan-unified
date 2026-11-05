import {db,json,ownerAuthorized,runtime,sameOrigin} from "@/lib/server";
import {elevenReadiness} from "@/lib/elevenlabs";
import {voiceConfigured} from "@/lib/voice-provider";
import {dispatchVoice} from "@/lib/voice-queue";
export async function GET(){if(!await ownerAuthorized())return json({},403);const rows=await db().prepare("SELECT id,request_id,status,due_at,attempts,result FROM actions WHERE kind='voice_callback' ORDER BY due_at DESC LIMIT 50").all();return json({configured:voiceConfigured(runtime()),provider:runtime().VOICE_PROVIDER||"vapi",readiness:elevenReadiness(runtime()),calls:rows.results});}
export async function POST(req:Request){if(!sameOrigin(req)||!await ownerAuthorized())return json({},403);return json(await dispatchVoice());}
