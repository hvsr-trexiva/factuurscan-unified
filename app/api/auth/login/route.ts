import {cookies} from 'next/headers';
import {validLoginCsrf,loginOriginAllowed} from '@/lib/login-csrf';
import {NextResponse} from 'next/server';
import {sessionToken,equal} from '@/lib/node-auth';
import {rateLimit,hash} from '@/lib/server';
import {publicOrigin} from '@/lib/request-origin';
export async function POST(request:Request){
 if(Number(request.headers.get('content-length')||0)>4096)return new Response('Request too large',{status:413});
 const f=await request.formData();const jar=await cookies();const valid=validLoginCsrf(jar.get('fs_login_csrf')?.value||'',String(f.get('csrf')||''));if(!loginOriginAllowed(request.headers.get('origin'),publicOrigin(request),valid))return new Response('Login security token missing or invalid. Open /login directly, allow site cookies, and try again.',{status:403});const email=String(f.get('email')||'').trim().toLowerCase();const password=String(f.get('password')||'');
 if(!await rateLimit(request,'login-v2:'+await hash(email),10))return new Response('Too many login attempts for this account. Try again after one hour.',{status:429,headers:{'Retry-After':'3600'}});
 if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<12||!process.env.ADMIN_EMAIL)return new Response('Configure admin credentials',{status:503});
 const expected=process.env.ADMIN_EMAIL.trim().toLowerCase();if(!equal(email,expected)||!equal(password,process.env.ADMIN_PASSWORD))return new Response('Invalid credentials',{status:401});
 const r=NextResponse.redirect(new URL('/admin',publicOrigin(request)),303);r.cookies.delete('fs_login_csrf');r.cookies.set('fs_session',sessionToken(process.env.ADMIN_EMAIL),{httpOnly:true,secure:new URL(publicOrigin(request)).protocol==='https:',sameSite:'strict',path:'/',maxAge:28800});return r;
}
