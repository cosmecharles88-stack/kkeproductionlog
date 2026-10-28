import {crewVisible} from './job-workflow.js';
export function jobPage(records,{search='',filter='active',page=1,pageSize=10,manager=true}={}) {
 const term=search.trim().toLowerCase();
 const millis=v=>typeof v?.toMillis==='function'?v.toMillis():typeof v?.seconds==='number'?v.seconds*1000:typeof v==='number'?v:Date.parse(v)||0;
 const filtered=records.filter(j=>(manager||crewVisible(j))&&(filter==='all'||(filter==='active'?['draft','awaiting_authorization','authorized','published'].includes(j.status):j.status===filter))&&`${j.address||''} ${j.city||''}`.toLowerCase().includes(term)).sort((a,b)=>millis(b.updatedAt)-millis(a.updatedAt)||String(b.date||'').localeCompare(String(a.date||''))||String(a.id).localeCompare(String(b.id)));
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));const current=Math.min(Math.max(1,page),pages);
 return {rows:filtered.slice((current-1)*pageSize,current*pageSize),total:filtered.length,pages,page:current};
}
