import {ownerAuthorized} from "@/lib/server";import {getChatGPTUser} from "@/app/chatgpt-auth";import DashboardAccess from "@/components/dashboard-access";import Admin from "./panel";
export const dynamic="force-dynamic";
export default async function Page(){const user=await getChatGPTUser();if(!user||!await ownerAuthorized())return <DashboardAccess user={user} returnTo="/beheer"/>;return <Admin/>;}
