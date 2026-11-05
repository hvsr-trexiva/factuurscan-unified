import {requireChatGPTUser} from "@/app/chatgpt-auth";import {ownerAuthorized} from "@/lib/server";import Workbench from "./workbench";
export default async function Page(){await requireChatGPTUser("/atelier");if(!await ownerAuthorized())return <main className="legal"><h1>Geen toegang</h1></main>;return <Workbench/>;}
