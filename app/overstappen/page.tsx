
import Localize from "@/components/site-language";
import SwitchIntake from "@/components/switch-intake";
export const metadata={title:"Regel mijn besparing en overstap | FactuurScan",description:"Uw zakelijke energieaanvraag in één dossier: factuur, toestemming, voorstellen en gekozen overstap."};
export default function Page(){return <Localize>{<><header className="comparison-header"><a className="brand" href="/">factuur<b>scan</b><small>.be</small></a><a className="comparison-home-link" href="/">← Terug naar de hoofdpagina</a><a className="button" href="/klantenservice">Persoonlijke hulp</a></header><SwitchIntake/><footer><a href="/">FactuurScan</a><div className="footer-links"><a href="/privacy">Privacy</a><a href="/gegevens-delen">Meetgegevens delen</a><a href="/klantenservice">Klantenservice</a></div></footer></>}</Localize>}
