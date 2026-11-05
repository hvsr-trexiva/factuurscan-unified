import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {verifySession} from '@/lib/node-auth';
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
export async function getChatGPTUser():Promise<ChatGPTUser|null>{const c=await cookies();const user=verifySession(c.get('fs_session')?.value||'');return user?{userId:'admin',displayName:user.email,email:user.email,fullName:null}:null;}
export async function requireChatGPTUser(returnTo:string){const user=await getChatGPTUser();if(!user)redirect('/login');return user;}
export function chatGPTSignInPath(returnTo:string){return '/login';}
export function chatGPTSignOutPath(returnTo='/'){return '/logout';}
