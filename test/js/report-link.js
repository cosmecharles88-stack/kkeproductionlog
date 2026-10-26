import {crewVisible} from './job-workflow.js';
import {profileTable} from './profiles.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function makeJobContext(job,areaId){
 if(job.status!=='authorized'||!crewVisible(job))throw Error('This job is not currently authorized.');
 const area=job.areas.find(a=>a.id===areaId);if(!area)throw Error('The selected work area no longer exists.');
 return {jobId:job.id,jobRevision:job.revision,jobAreaId:area.id,address:job.address,city:job.city,surveyDate:job.date,supplies:job.supplies,notes:job.notes,locates:job.locates,authorization:{customer:job.authorization.customer,date:job.authorization.date,confirmedBy:job.authorization.confirmedBy},area:JSON.parse(JSON.stringify(area))};
}
export function linkedReportFields(context,actualRows){
 return {jobId:context.jobId,jobRevision:context.jobRevision,jobAreaId:context.jobAreaId,jobScopeSnapshot:context,profile:actualRows.map(r=>{const station=Number(String(r.station).replace(/\s*ft$/,''));const target=context.area.profile?.rows.find(t=>Number(t.station)===station);return {...r,d1Target:target?.neTarget??'',d2Target:target?.swTarget??''};})};
}
export function checkJobRevision(context,job){if(!job||job.status!=='authorized'||!crewVisible(job)||job.revision!==context.jobRevision||!job.areas.some(a=>a.id===context.jobAreaId))throw Error('The job authorization or scope changed. Reopen the current job sheet before submitting. Your report entries remain on this device.');}
function form(){return document.getElementById('crewForm');}
function input(){let el=form().elements.jobContext;if(!el){el=document.createElement('input');el.type='hidden';el.name='jobContext';form().append(el);}return el;}
export function readJobContext(){const raw=input().value;return raw?JSON.parse(raw):null;}
export function clearJobContext(){input().value='';renderJobContext();}
export function renderJobContext(){let host=document.getElementById('report-job-context');if(!host){host=document.createElement('section');host.id='report-job-context';host.className='jobs-card';form().prepend(host);}const c=readJobContext();host.hidden=!c;if(!c)return;
 host.innerHTML=`<h2>Authorized job · ${esc(c.address)}</h2><p>${esc(c.area.label)} · Scope revision ${esc(c.jobRevision)}</p><p>Customer approval: ${esc(c.authorization.customer)} · ${esc(c.authorization.date)}</p><p><strong>Utility locates needed:</strong> ${esc(c.locates)}</p><p><strong>Supplies:</strong> ${esc(c.supplies)}</p><p style="white-space:pre-wrap"><strong>Scope:</strong> ${esc(c.notes)}\n${esc(c.area.instructions)}</p><p>Record actual results below. Isaiah’s targets remain unchanged.</p>${c.area.profile?`<h3>Isaiah’s before / target profiles</h3><p>${esc(c.area.profile.units)}</p>${profileTable(c.area.profile.rows)}`:''}<div class="photo-grid">${(c.area.photos||[]).map(p=>`<figure><img src="${esc(p.url)}" alt="${esc(p.name)}"><figcaption>${esc(p.name)}</figcaption></figure>`).join('')}</div><p>One report covers this work area. Start another report for each additional area.</p>`;
}
export function fillLinkedProfile(context,rows=null){const tbody=document.getElementById('profileRows');tbody.innerHTML='';const source=rows||context.area.profile?.rows?.map(r=>({station:`${r.station} ft`,d1Before:r.neBefore,d1After:'',d2Before:r.swBefore,d2After:''}))||[];
 for(const r of source){const tr=document.createElement('tr');tr.innerHTML=`<td class="station-cell">${esc(r.station)}</td>${['d1Before','d1After','d2Before','d2After'].map((k,i)=>`<td><input type="number" step="0.01" value="${esc(r[k])}" aria-label="${['North/East Before','North/East Actual after','South/West Before','South/West Actual after'][i]} at ${esc(r.station)}"></td>`).join('')}`;tbody.append(tr);}
 const card=document.getElementById('roadProfileCard');if(source.length)card.style.display='block';
 document.getElementById('btnBuildRows').disabled=!!context.area.profile;
 document.getElementById('profileLength').readOnly=!!context.area.profile;
 document.getElementById('profileInterval').readOnly=!!context.area.profile;
}
export function initializeReportLink({loadJob,switchToReport,notify,recalculate}){
 input();
 document.addEventListener('kke:start-job-report',async event=>{
  try{const job=await loadJob(event.detail.jobId),context=makeJobContext(job,event.detail.areaId);
   // Preserve existing in-progress work unless the employee explicitly replaces it.
   const dirty=[...new FormData(form()).entries()].some(([k,v])=>['address','notes','crewLead','startTime','jobContext'].includes(k)&&String(v).trim());
   if(dirty&&!window.confirm('Replace the current report draft with this authorized work area?'))return;
   form().reset();input().value=JSON.stringify(context);
   const set=(name,value)=>{const el=form().elements[name];if(!el)return;if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===String(value))){el.add(new Option(value,value));}el.value=value??'';};
   set('address',context.address);window.setKKEAddressAutocompleteValue?.('jobAddress',context.address);set('city',context.city);set('date',new Date().toLocaleDateString('en-CA'));set('liftAreaLength',context.area.length);set('liftAreaWidth',context.area.width);set('originalSettlement',context.area.sunk);set('liftAreaNotes',context.area.label);
   const types=[...form().elements.workAreaType.options].map(o=>o.value);const type=types.includes(context.area.type)?context.area.type:'Other';set('workAreaType',type);set('workAreaOther',type==='Other'?context.area.type:'');
   set('linearFeet',context.area.profile?.length||context.area.length);document.getElementById('profileInterval').value=context.area.profile?.interval||10;
   recalculate?.();fillLinkedProfile(context);renderJobContext();form().dispatchEvent(new Event('input',{bubbles:true}));switchToReport();form().scrollIntoView({block:'start'});notify('Authorized job loaded. Enter the crew, production details, actual after readings, and completion photos.');
  }catch(e){notify(e.message,'error');}
 });
}
