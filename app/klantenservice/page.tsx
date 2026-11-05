
import Localize from "@/components/site-language";
import CustomerService from "@/components/customer-service";
export const metadata={title:"Klantenservice, accountmanager en terugbellen | FactuurScan"};
export default function Page(){return <Localize>{<><header className="comparison-header"><a href="/" className="brand">factuur<b>scan</b><small>.be</small></a><a className="comparison-home-link" href="/">← Terug naar de hoofdpagina</a><a className="button" href="/overstappen">Mijn overstapaanvraag</a></header><CustomerService/><footer><a href="/privacy">Privacy</a><a href="/gegevensbeveiliging">Gegevensbescherming</a></footer></>}</Localize>}
