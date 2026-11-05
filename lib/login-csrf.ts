import {timingSafeEqual} from 'node:crypto';
/** Validate a token returned by our GET endpoint against its HttpOnly browser cookie. */
export function validLoginCsrf(cookie:string,submitted:string){return /^[a-f0-9]{64}$/.test(cookie)&&/^[a-f0-9]{64}$/.test(submitted)&&timingSafeEqual(Buffer.from(cookie),Buffer.from(submitted));}
export function loginOriginAllowed(origin:string|null,expected:string,csrfValid:boolean){if(!csrfValid)return false;if(origin===null||origin==='null')return true;try{return new URL(origin).origin===expected;}catch{return false;}}
