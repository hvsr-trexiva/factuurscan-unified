import catalog from "../data/own-monthly-tariffs.json";
import directory from "../data/supplier-directory.json";
export const primarySuppliers=["ENGIE","Luminus","Eneco","TotalEnergies"] as const;
export const additionalSuppliers=directory.suppliers;
export const mandateSuppliers=[...primarySuppliers,...additionalSuppliers,"Andere"] as [string,...string[]];
export const supplierDirectorySource=directory.source;
export const isPricedSupplier=(name:string)=>catalog.products.filter(p=>p.role==="reference").map(p=>p.supplier).some(n=>n.toLowerCase()===name.trim().toLowerCase());
