import type {NextConfig} from 'next';
const config:NextConfig={serverExternalPackages:['node:sqlite'],async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'no-referrer'}]}];}};
export default config;
