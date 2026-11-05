import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {publicOrigin} from '@/lib/request-origin';
export const dynamic='force-dynamic';
export async function GET(request:Request){const token=randomBytes(32).toString('hex');const r=NextResponse.json({token},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});r.cookies.set('fs_login_csrf',token,{httpOnly:true,secure:publicOrigin(request).startsWith('https:'),sameSite:'strict',path:'/',maxAge:600});return r;}
