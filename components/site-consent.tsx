"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {CookieChoices} from "./funnel";
export default function SiteConsent(){const path=usePathname(),allowed=["/","/voorbeeldrapport","/klantendashboard"].includes(path||"");const [pixel,setPixel]=useState<string|null>(null);useEffect(()=>{if(!allowed){window.fsAnalytics=false;window.fsMarketing=false;return;}fetch("/api/config").then(r=>r.json() as Promise<{pixel:string|null}>).then(c=>setPixel(c.pixel)).catch(()=>{});},[allowed]);return allowed?<CookieChoices pixel={pixel}/>:null;}
