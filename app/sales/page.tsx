import {getChatGPTUser} from "@/app/chatgpt-auth";import {ownerAuthorized,dashboardReadAuthorized} from "@/lib/server";import DashboardAccess from "@/components/dashboard-access";import Sales from "./dashboard";import "./sales.css";
export const dynamic="force-dynamic";
export default async function Page(){const user=await getChatGPTUser();if(!user||!await dashboardReadAuthorized())return <DashboardAccess user={user} returnTo="/sales"/>;return <Sales readOnly={!await ownerAuthorized()}/>;}
