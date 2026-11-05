/** Node 24 replacements for D1 and private R2. One database shared by all routes. */
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,readdirSync,writeFileSync,renameSync,existsSync,unlinkSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
const root=resolve(process.env.DATA_DIRECTORY||'private-data');
mkdirSync(root,{recursive:true,mode:0o700});
const connection=new DatabaseSync(join(root,'factuurscan.sqlite'));
connection.exec('PRAGMA busy_timeout=30000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS node_migrations(name TEXT PRIMARY KEY);');
for(const name of readdirSync(resolve('drizzle')).filter(n=>n.endsWith('.sql')).sort()){
 connection.exec('BEGIN IMMEDIATE');try{if(!connection.prepare('SELECT name FROM node_migrations WHERE name=?').get(name)){connection.exec(readFileSync(resolve('drizzle',name),'utf8'));connection.prepare('INSERT INTO node_migrations VALUES (?)').run(name);}connection.exec('COMMIT');}catch(e){connection.exec('ROLLBACK');throw e;}
}
class Statement{
 values:any[]=[];constructor(public sql:string){} bind(...values:any[]){const s=new Statement(this.sql);s.values=values.map(v=>v===undefined?null:v);return s;}
 async first<T=Record<string,unknown>>(column?:string):Promise<T|null>{const row=connection.prepare(this.sql).get(...this.values) as any;return row?(column?row[column]:row):null;}
 async all<T=Record<string,unknown>>(){return {results:connection.prepare(this.sql).all(...this.values) as T[],success:true,meta:{}};}
 async run(){const r=connection.prepare(this.sql).run(...this.values);return {success:true,results:[],meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}
}
const database={prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){connection.exec('BEGIN IMMEDIATE');try{const result=[];for(const s of statements){const stmt=connection.prepare(s.sql);if(/^\s*(SELECT|WITH)/i.test(s.sql)||/RETURNING/i.test(s.sql))result.push({results:stmt.all(...s.values),success:true,meta:{}});else{const r=stmt.run(...s.values);result.push({success:true,results:[],meta:{changes:Number(r.changes)}});}}connection.exec('COMMIT');return result;}catch(e){connection.exec('ROLLBACK');throw e;}}};
const objectRoot=join(root,'objects');mkdirSync(objectRoot,{recursive:true,mode:0o700});
function objectPath(key:string){const p=resolve(objectRoot,key);if(!p.startsWith(objectRoot+'/'))throw Error('Invalid object key');return p;}
const storage={async list(options:any={}){const keys:string[]=[];function walk(dir:string){for(const e of readdirSync(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory())walk(path);else keys.push(path.slice(objectRoot.length+1));}}walk(objectRoot);return {objects:keys.filter(k=>k.startsWith(options.prefix||"" )).slice(0,options.limit||1000).map(key=>({key})),truncated:false};},async put(key:string,value:any,options?:any){const p=objectPath(key);mkdirSync(dirname(p),{recursive:true,mode:0o700});let bytes;if(typeof value==='string')bytes=Buffer.from(value);else if(value instanceof ArrayBuffer||ArrayBuffer.isView(value))bytes=Buffer.from(value instanceof ArrayBuffer?new Uint8Array(value):new Uint8Array(value.buffer,value.byteOffset,value.byteLength));else bytes=Buffer.from(await new Response(value).arrayBuffer());const temp=p+'.'+crypto.randomUUID()+'.tmp';writeFileSync(temp,bytes,{mode:0o600});renameSync(temp,p);return {key};},async get(key:string){const p=objectPath(key);if(!existsSync(p))return null;const b=readFileSync(p);return {body:new Uint8Array(b),size:b.length,arrayBuffer:async()=>new Uint8Array(b).buffer,text:async()=>b.toString(),json:async()=>JSON.parse(b.toString())};},async delete(keys:string|string[]){for(const key of Array.isArray(keys)?keys:[keys]){const p=objectPath(key);if(existsSync(p))unlinkSync(p);}}};
export const env:any=new Proxy({}, {get(_target,key){if(key==='DB')return database;if(key==='BUCKET')return storage;return process.env[String(key)];}});
