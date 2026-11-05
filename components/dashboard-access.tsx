import {chatGPTSignInPath,chatGPTSignOutPath,type ChatGPTUser} from "@/app/chatgpt-auth";
import {runtime} from "@/lib/server";

export default function DashboardAccess({user,returnTo}:{user:ChatGPTUser|null;returnTo:string}){
  const configured=!!runtime().ADMIN_EMAIL?.trim();
  return <main className="dashboard-access"><section>
    <a className="dashboard-access-brand" href="/">FactuurScan ↗</a>
    <p className="dashboard-access-label">BEVEILIGDE WERKPLEK</p>
    <h1>{user?"Dit account heeft geen dashboardtoegang":"Open je salesdashboard"}</h1>
    {user?<><p>Je bent aangemeld als <strong>{user.email}</strong>.</p><p>{configured?"Dit account heeft geen toegangsrol voor deze pagina. Meld je af en gebruik het ingestelde beheerdersaccount of een toegestaan revieweraccount.":"De beheerderstoegang is nog niet ingesteld. Geef onderstaande toegangscode door zodat de configuratie kan worden hersteld."}</p><a className="dashboard-access-button" href={chatGPTSignOutPath(returnTo)} target="_top">Afmelden en ander account gebruiken</a></>:<><p>Meld je aan met het ingestelde FactuurScan-beheerdersaccount.</p><a className="dashboard-access-button" href={chatGPTSignInPath(returnTo)} target="_top">Aanmelden →</a></>}
    <p className="dashboard-access-note">Open deze pagina in je gewone browser als aanmelden binnen een ingesloten venster niet lukt.</p>
    <a className="dashboard-access-link" href={returnTo} target="_top">Dashboard opnieuw openen ↗</a>
    <small>Toegangscode: {!user?"FS-AUTH-01":configured?"FS-AUTH-02":"FS-AUTH-03"}</small>
  </section></main>;
}
