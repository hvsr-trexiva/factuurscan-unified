import {NextResponse} from 'next/server';
export async function GET(request:Request){const r=NextResponse.redirect(new URL('/login',request.url));r.cookies.delete('fs_session');return r;}
