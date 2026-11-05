
import Localize from "@/components/site-language";
import Link from "next/link";
import DataSharing from "@/components/data-sharing";
export const metadata={title:"Gratis energiescan en gegevens delen | FactuurScan",description:"Vraag een gratis energiescan aan, lever zelf meetgegevens aan of leg een beperkte gegevensmachtiging vast."};
export default function Page(){return <Localize>{<><header><Link className="brand" href="/">factuur<b>scan</b><small>.be</small></Link><Link href="/" className="back-link">← Naar de website</Link><Link className="button" href="/#upload">Gratis energiescan</Link></header><DataSharing/><footer><Link href="/">← FactuurScan</Link><div className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/bedrijfsgegevens">Factuurscan BV</Link></div></footer></>}</Localize>}
