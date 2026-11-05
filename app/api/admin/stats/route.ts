import {db,json,ownerAuthorized} from "@/lib/server";
export async function GET(){if(!await ownerAuthorized())return json({},403);const since=new Date(Date.now()-30*86400000).toISOString();const [events,sessions,leads]=await Promise.all([
db().prepare("SELECT event,COUNT(*) AS total FROM audit WHERE substr(event,1,4)='web_' AND created_at>=? GROUP BY event").bind(since).all(),
db().prepare("SELECT COUNT(DISTINCT json_extract(details,'$.session')) AS total FROM audit WHERE event='web_page_view' AND created_at>=?").bind(since).first<{total:number}>(),
db().prepare("SELECT kind,COUNT(*) AS total FROM requests WHERE created_at>=? GROUP BY kind").bind(since).all()]);return json({since,events:events.results,sessions:sessions?.total||0,leads:leads.results,basis:"Gemeten toestemmingssessies per kalenderdag, geen unieke personen. Aanvragen omvatten alle opgeslagen dossiers; bezoeken en aanvragen hebben niet dezelfde meetbasis."});}
