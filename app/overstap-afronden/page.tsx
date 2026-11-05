"use client";
import Localize from "@/components/site-language";

import {useEffect,useState} from "react";
import FastSwitchCheckout from "@/components/fast-switch-checkout";
export default function Page(){const [access,setAccess]=useState<{id:string;key:string}|null>(null);useEffect(()=>{const [id,key]=location.hash.slice(1).split(":");if(id&&key)setAccess({id,key})},[]);return <Localize>{<main className="checkout-standalone"><a className="brand" href="/">factuur<b>scan</b><small>.be</small></a>{access?<div id="mijn-resultaat"><FastSwitchCheckout id={access.id} accessKey={access.key}/></div>:<><h1>Ga verder met uw energiedossier</h1><p>Open uw persoonlijke link uit de e-mail of start met een vergelijking.</p><a className="button" href="/energie-vergelijken">Vergelijk mijn energie →</a></>}</main>}</Localize>}
