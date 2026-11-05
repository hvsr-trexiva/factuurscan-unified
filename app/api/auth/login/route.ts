import {NextResponse} from 'next/server';
import {sessionToken,equal} from '@/lib/node-auth';
import {rateLimit,sameOrigin,hash} from '@/lib/server';
import {publicOrigin} from '@/lib/request-origin';
export async function POST(request:Request){
 if(!sameOrigin(request))return new Response('Invalid website origin. Check APP_ORIGIN in Hostinger.',{status:403});
 if(Number(request.headers.get('content-length')||0)>4096)return new Response('Request too large',{status:413});
 const f=await request.formData();const email=String(f.get('email')||'').trim().toLowerCase();const password=String(f.get('password')||'');
 if(!await rateLimit(request,'login-v2:'+await hash(email),10))return new Response('Too many login attempts for this account. Try again after one hour.',{status:429,headers:{'Retry-After':'3600'}});
 if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<12||!process.env.ADMIN_EMAIL)return new Response('Configure admin credentials',{status:503});
 const expected=process.env.ADMIN_EMAIL.trim().toLowerCase();if(!equal(email,expected)||!equal(password,process.env.ADMIN_PASSWORD))return new Response('Invalid credentials',{status:401});
 const r=NextResponse.redirect(new URL('/admin',publicOrigin(request)),303);r.cookies.set('fs_session',sessionToken(process.env.ADMIN_EMAIL),{httpOnly:true,secure:new URL(publicOrigin(request)).protocol==='https:',sameSite:'strict',path:'/',maxAge:28800});return r;
}
