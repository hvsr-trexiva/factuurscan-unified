import {NextResponse} from 'next/server';
import {publicOrigin} from '@/lib/request-origin';
export async function GET(request:Request){const r=NextResponse.redirect(new URL('/login',publicOrigin(request)));r.cookies.delete('fs_session');return r;}
