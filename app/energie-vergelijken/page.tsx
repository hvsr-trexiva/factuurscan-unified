
import Localize from "@/components/site-language";
import BusinessComparison from "@/components/business-comparison";
export const metadata={title:"Uw energievoorstel en besparing | FactuurScan",description:"Vergelijk het eigen leveranciersaanbod van FactuurScan. Uw jaarprijs, mogelijk voordeel en overstap helder in één dossier."};
export default function Page(){return <Localize>{<><header className="comparison-header"><a className="brand" href="/" aria-label="FactuurScan hoofdpagina">factuur<b>scan</b><small>.be</small></a><a className="comparison-home-link" href="/">← Hoofdpagina</a><a className="button" href="/overstappen">Gratis factuurcontrole</a></header><BusinessComparison/><footer><a href="/">← FactuurScan</a><div className="footer-links"><a href="/privacy">Privacy</a><a href="/voorwaarden">Voorwaarden</a><a href="/klantenservice">Persoonlijke hulp</a></div></footer></>}</Localize>}
