import React from 'react';
import { Box, Coins, History, LayoutDashboard, Settings, ShoppingCart, User, Users, LogOut } from 'lucide-react';
import { FDA_LOGO_URL } from '../../assets/logo';
export const staffSections = (roles: string[]) => {
  const has = (...allowed: string[]) => roles.some(role => allowed.includes(role));
  return [
    {id:'overview',label:'My Role Dashboard',icon:LayoutDashboard,show:true},
    {id:'hr',label:'HRMIS & Personnel',icon:Users,show:has('MANAGING_DIRECTOR','HR_DIRECTOR')},
    {id:'accounting',label:'Accounts & Periods',icon:Coins,show:has('MANAGING_DIRECTOR','FINANCE_DIRECTOR','INTERNAL_AUDITOR')},
    {id:'plans',label:'Procurement Planning',icon:ShoppingCart,show:has('MANAGING_DIRECTOR','FINANCE_DIRECTOR','PROCUREMENT_OFFICER','COUNTY_OFFICER','INTERNAL_AUDITOR')},
    {id:'payroll',label:'Payroll',icon:Users,show:has('MANAGING_DIRECTOR','HR_DIRECTOR','FINANCE_DIRECTOR','INTERNAL_AUDITOR')},
    {id:'evaluation',label:'Bid Evaluation',icon:ShoppingCart,show:has('MANAGING_DIRECTOR','PROCUREMENT_OFFICER','FINANCE_DIRECTOR','COUNTY_OFFICER','INTERNAL_AUDITOR')},
    {id:'reconciliation',label:'Bank Reconciliation',icon:Coins,show:has('MANAGING_DIRECTOR','FINANCE_DIRECTOR','INTERNAL_AUDITOR')},
    {id:'stocktaking',label:'Stocktaking',icon:Box,show:has('MANAGING_DIRECTOR','ASSET_OFFICER','COUNTY_OFFICER','PROCUREMENT_OFFICER','FINANCE_DIRECTOR','INTERNAL_AUDITOR')},
    {id:'depreciation',label:'Depreciation',icon:Coins,show:has('MANAGING_DIRECTOR','FINANCE_DIRECTOR','INTERNAL_AUDITOR')},
    {id:'integrations',label:'Integration Status',icon:Settings,show:has('MANAGING_DIRECTOR','INTERNAL_AUDITOR')},
    {id:'account',label:'My Account & Self-Service',icon:User,show:true},
    {id:'workflow',label:'Procurement & Approvals',icon:ShoppingCart,show:has('MANAGING_DIRECTOR','FINANCE_DIRECTOR','PROCUREMENT_OFFICER','ASSET_OFFICER','COUNTY_OFFICER','INTERNAL_AUDITOR')},
    {id:'finance',label:'Finance & Vote Book',icon:Coins,show:has('MANAGING_DIRECTOR','FINANCE_DIRECTOR','INTERNAL_AUDITOR')},
    {id:'assets',label:'Asset Register',icon:Box,show:has('MANAGING_DIRECTOR','FINANCE_DIRECTOR','ASSET_OFFICER','COUNTY_OFFICER','PROCUREMENT_OFFICER','INTERNAL_AUDITOR')},
    {id:'publication',label:'Public Procurement',icon:ShoppingCart,show:has('MANAGING_DIRECTOR','PROCUREMENT_OFFICER')},
    {id:'audit',label:'Audit Trail',icon:History,show:has('MANAGING_DIRECTOR','FINANCE_DIRECTOR','INTERNAL_AUDITOR')},
    {id:'setup',label:'Administration',icon:Settings,show:has('MANAGING_DIRECTOR')},
  ].filter(item=>item.show);
};
export function StaffShell({name,roles,active,onSelect,onLogout,children}:{name:string;roles:string[];active:string;onSelect:(id:string)=>void;onLogout:()=>void;children:React.ReactNode}) {
  return <div className="min-h-screen bg-slate-100"><header className="bg-forest-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><img src={FDA_LOGO_URL} alt="FDA" className="h-12 w-auto"/><div><h1 className="font-bold text-sm sm:text-lg uppercase">Forestry Development Authority</h1><p className="text-xs text-forest-200">Integrated MIS/ERP Core Platform • Whein Town HQ</p></div></div><a className="text-sm text-emerald-200" href="/">Public Portal</a></header><div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)]"><aside className="md:w-64 shrink-0 bg-slate-900 text-white"><div className="p-4 border-b border-slate-800"><p className="font-semibold text-sm">{name}</p><p className="text-xs text-emerald-300 mt-2">{roles.map(r=>r.replaceAll('_',' ')).join(' · ')}</p></div><nav aria-label="Staff modules" className="p-3 flex md:flex-col overflow-x-auto gap-1">{staffSections(roles).map(({id,label,icon:Icon})=><button key={id} aria-current={active===id?'page':undefined} onClick={()=>onSelect(id)} className={`flex items-center gap-3 text-left px-3 py-3 rounded-lg text-xs font-bold whitespace-nowrap ${active===id?'bg-forest-700 text-white':'text-slate-300 hover:bg-slate-800'}`}><Icon className="w-5 h-5"/>{label}</button>)}</nav><button onClick={onLogout} className="m-4 flex items-center gap-2 text-xs text-slate-300"><LogOut size={16}/>Sign out</button></aside><div className="flex-1 min-w-0">{children}</div></div></div>;
}
