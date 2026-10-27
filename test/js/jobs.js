import {mountGps,gpsLinks,mountSurveyAddress} from './survey-location.js';
import {STATUS_LABELS, crewVisible, authorizationError} from './job-workflow.js';
import {jobPage} from './job-list.js';
import {mountProfile, readProfile, profileTable} from './profiles.js';
import { getApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';
import { WORK_TYPES, validateScope } from './jobs-model.js';
const managers=['kkeincinfo@gmail.com','steverickenbrode@gmail.com','isaiah051812@gmail.com','cosmecharles88@gmail.com'];
const allowed=[...managers,'varga307188@gmail.com','logan95mc@gmail.com','hectordanielzamarripajunior@gmail.com'];
const app=getApp(), auth=getAuth(app), db=getFirestore(app), storage=getStorage(app);
const appId=typeof __app_id!=='undefined'?__app_id:'kke-profile-sheet-main';
const jobs=collection(db,'artifacts',appId,'public','data','jobs');
const root=document.getElementById('jobs-root');
let listSearch='',listFilter='active',listPage=1;
let stop,records=[],selected=null,busy=false,manager=false,session=0;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>crypto.randomUUID();
const status=t=>{root.querySelector('#jobs-status').textContent=t;root.querySelectorAll('[data-survey-feedback]').forEach(el=>{el.textContent=t;});};
function field(label,name,value='',type='text'){return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}"></label>`;}
function text(label,name,value=''){return `<label>${label}<textarea name="${name}">${esc(value)}</textarea></label>`;}
function areaForm(a={id:id()}){
 const box=document.createElement('fieldset');box.className='jobs-card';box.dataset.area=a.id;
 box.innerHTML=`<legend>Work area</legend>${field('Area label (example: driveway north corner)','label',a.label)}<label>Work type<select name="type">${WORK_TYPES.map(t=>`<option ${a.type===t?'selected':''}>${t}</option>`).join('')}</select></label><div class="jobs-grid">${field('Length (feet)','length',a.length,'number')}${field('Width (feet)','width',a.width,'number')}${field('Amount sunk (inches)','sunk',a.sunk,'number')}</div><div data-gps-editor></div><div data-profile-editor></div>${a.before||a.target?`<details><summary>Earlier profile notes</summary>${text('Earlier before profile notes','before',a.before)}${text('Earlier target profile notes','target',a.target)}</details>`:''}${text('Instructions / exclusions','instructions',a.instructions)}<label>Site photos for this area<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p>On iPad, choose Take Photo or Photo Library. Up to 10 MB per photo.</p><div class="photo-grid">${(a.photos||[]).map(p=>`<figure><img src="${esc(p.url)}" alt="${esc(p.name)}"><figcaption>${esc(p.name)}</figcaption></figure>`).join('')}</div><button type="button" class="secondary" data-remove>Remove area</button>`;
 mountGps(box.querySelector('[data-gps-editor]'),a.gpsPoints||[]);
 mountProfile(box.querySelector('[data-profile-editor]'),a.profile,a.length);
 box.querySelectorAll('input[name=length],input[name=width],input[name=sunk]').forEach(el=>{el.min='0';el.step='any';});
 box.querySelector('[data-remove]').onclick=()=>{box.dispatchEvent(new Event('change',{bubbles:true}));box.remove();};return box;
}
function canAuthorize(){return ['isaiah051812@gmail.com','cosmecharles88@gmail.com'].includes(auth.currentUser?.email);}
function backToJobs(){selected=null;root.querySelector('#jobs-detail').innerHTML='';root.querySelector('#jobs-list').hidden=false;root.scrollIntoView({block:'start'});}
function shell(){root.innerHTML=`<h2>Jobs &amp; Scope</h2><p>Site surveys, before profiles, and target profiles for the crew.</p><div id="jobs-status" role="status" aria-live="polite"></div><div id="jobs-list"></div><div id="jobs-detail"></div>`;}
function list(){
 const box=root.querySelector('#jobs-list');
 if(!box.querySelector('#job-search')){
  box.innerHTML=`<div class="jobs-card"><div class="jobs-list-heading"><h3>${manager?'Surveys & jobs':'Job scopes'}</h3>${manager?'<button id="new-job">New survey</button>':''}</div><div class="jobs-grid"><label>Search address or city<input id="job-search" type="search" placeholder="Find a job…"></label><label>Status<select id="job-filter">${(manager?['active','draft','awaiting_authorization','authorized','completed','archived','all']:['authorized','completed']).map(v=>`<option value="${v}">${({active:'Active surveys',all:'All statuses'})[v]||STATUS_LABELS[v]||v}</option>`).join('')}</select></label></div><div id="job-results"></div></div>`;
  box.querySelector('#job-search').value=listSearch;box.querySelector('#job-filter').value=listFilter;
  box.querySelector('#job-search').oninput=e=>{listSearch=e.target.value;listPage=1;renderRows();};
  box.querySelector('#job-filter').onchange=e=>{listFilter=e.target.value;listPage=1;renderRows();};
  box.querySelector('#new-job')?.addEventListener('click',()=>open({id:id(),status:'draft',areas:[]}));
 }
 renderRows();
}
function renderRows(){
 const result=jobPage(records,{search:listSearch,filter:listFilter,page:listPage,manager});listPage=result.page;
 const box=root.querySelector('#job-results');
 box.innerHTML=`<p role="status">${result.total} matching ${result.total===1?'job':'jobs'} · Most recently updated first</p><div class="scope-profile-wrap"><table class="jobs-list-table"><thead><tr><th>Address</th><th>City</th><th>Survey date</th><th>Status</th><th>Actions</th></tr></thead><tbody>${result.rows.map(j=>`<tr><td>${esc(j.address)}</td><td>${esc(j.city)}</td><td>${esc(j.date||'—')}</td><td><span class="job-badge">${esc(STATUS_LABELS[j.status]||j.status)}</span></td><td><button data-job="${esc(j.id)}">Open</button>${manager&&j.status==='authorized'?`<button class="secondary" data-state="completed" data-id="${esc(j.id)}">Complete</button>`:''}${manager&&j.status!=='archived'?`<button class="secondary" data-state="archived" data-id="${esc(j.id)}">Archive</button>`:''}${manager&&['authorized','completed','archived','published'].includes(j.status)?`<button class="secondary" data-state="draft" data-id="${esc(j.id)}">Reopen as draft</button>`:''}</td></tr>`).join('')||'<tr><td colspan="5">No jobs match. Try another search or status.</td></tr>'}</tbody></table></div><div class="jobs-pagination"><button data-page="-1" ${result.page===1?'disabled':''}>Previous</button><span>Page ${result.page} of ${result.pages}</span><button data-page="1" ${result.page===result.pages?'disabled':''}>Next</button></div>`;
 box.querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>open(records.find(j=>j.id===b.dataset.job)));
 box.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{listPage+=Number(b.dataset.page);renderRows();});
 box.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>changeJobState(b.dataset.id,b.dataset.state));
}
async function changeJobState(jobId,state){
 if(busy)return;busy=true;
 try{const job=records.find(j=>j.id===jobId);await setDoc(doc(jobs,jobId),{status:state,revision:(job.revision||0)+1,updatedAt:serverTimestamp(),updatedBy:auth.currentUser.email,...(state==='draft'?{authorization:null}:{})},{merge:true});if(selected?.id===jobId)backToJobs();status(`Job moved to ${state}.`);}catch(e){status(`Status change failed: ${e.message}`);}finally{busy=false;}
}
function open(job){selected=job;const detail=root.querySelector('#jobs-detail');status('');root.querySelector('#jobs-list').hidden=true;detail.innerHTML='<button type="button" id="back-jobs">← Back to jobs</button><div id="job-sheet"></div>';detail.querySelector('#back-jobs').onclick=backToJobs;const sheet=detail.querySelector('#job-sheet');root.scrollIntoView({block:'start'});
 if(!manager||['authorized','completed','archived','published'].includes(job.status)){sheet.innerHTML=`<article class="jobs-card"><h3>${esc(job.address)}</h3><p><strong>${esc(STATUS_LABELS[job.status]||job.status)}</strong></p>${job.authorization?.confirmed?`<p>Authorized by ${esc(job.authorization.customer)} on ${esc(job.authorization.date)} · Confirmed by ${esc(job.authorization.confirmedBy)}.</p>`:''}<p>${esc(job.city)} · Survey date: ${esc(job.date)} · Revision ${esc(job.revision)}</p><p>Utility locates needed: ${esc(job.locates)}</p><h4>Supplies</h4><p style="white-space:pre-wrap">${esc(job.supplies)}</p><h4>Job notes</h4><p style="white-space:pre-wrap">${esc(job.notes)}</p>${job.areas.map(a=>`<section class="jobs-card">${job.status==='authorized'?`<button type="button" data-start-report="${esc(a.id)}">Start Job Report — this area</button>`:''}<h4>${esc(a.label)} · ${esc(a.type)}</h4>${gpsLinks(a.gpsPoints)}<p>${esc(a.length)} × ${esc(a.width)} feet · Sunk ${esc(a.sunk)} inches</p>${a.profile?`<h4>Before / target profiles</h4><p>Readings: ${esc(a.profile.units)}</p>${profileTable(a.profile.rows)}`:`<h4>Before profiles</h4><p style="white-space:pre-wrap">${esc(a.before)}</p><h4>Target profiles</h4><p style="white-space:pre-wrap">${esc(a.target)}</p>`}<p style="white-space:pre-wrap">${esc(a.instructions)}</p><div class="photo-grid">${(a.photos||[]).map(p=>`<figure><img src="${esc(p.url)}" alt="${esc(p.name)}"><figcaption>${esc(p.name)}</figcaption></figure>`).join('')}</div></section>`).join('')}</article>`;sheet.querySelectorAll('[data-start-report]').forEach(button=>button.onclick=()=>document.dispatchEvent(new CustomEvent('kke:start-job-report',{detail:{jobId:job.id,areaId:button.dataset.startReport}})));if(manager&&job.status!=='archived'){sheet.insertAdjacentHTML('beforeend','<button id="reopen-survey">Reopen as draft for changes</button>');sheet.querySelector('#reopen-survey').onclick=()=>changeJobState(job.id,'draft');}return;}
 sheet.innerHTML=`<form id="scope-form" class="jobs-card" novalidate><h3>${job.status==='awaiting_authorization'?'Survey awaiting authorization':'Site survey'}</h3><p>Saving or submitting a survey does not send it to the crew. Isaiah or Cosme must confirm customer authorization separately. Changes to an authorized scope require reopening it as a draft and authorizing it again.</p><div class="jobs-grid">${field('Address','address',job.address)}${field('City','city',job.city)}${field('Survey date','date',job.date||new Date().toLocaleDateString('en-CA'),'date')}</div><label>Utility locates needed?<select name="locates">${['Unknown','Yes','No'].map(v=>`<option ${job.locates===v?'selected':''}>${v}</option>`).join('')}</select></label>${text('Supplies needed','supplies',job.supplies)}${text('Crew-visible job notes','notes',job.notes)}<p>All information in this form is shared with crews only after job authorization. Keep private pricing elsewhere.</p><div id="work-areas"></div><button type="button" id="add-area">Add work area</button><hr><button type="submit" value="draft">Save draft</button><button type="submit" value="awaiting_authorization">Submit survey</button><p data-survey-feedback role="status" aria-live="polite" style="font-weight:600;white-space:pre-wrap"></p></form>`;
 mountSurveyAddress(detail.querySelector('#scope-form'));
 const areas=detail.querySelector('#work-areas');(job.areas.length?job.areas:[{id:id()}]).forEach(a=>areas.append(areaForm(a)));
 detail.querySelector('#add-area').onclick=()=>{areas.append(areaForm());detail.querySelector('#scope-form').dataset.dirty='true';};
 detail.querySelector('form').onsubmit=save;detail.querySelector('form').addEventListener('input',()=>{detail.querySelector('#scope-form').dataset.dirty='true';});detail.querySelector('form').addEventListener('change',()=>{detail.querySelector('#scope-form').dataset.dirty='true';});
 if(job.status==='awaiting_authorization'&&canAuthorize()){const panel=document.createElement('div');panel.className='jobs-card authorization-panel';panel.innerHTML=`<h3>Confirm job authorization</h3><p>Only authorize after the customer approves the saved scope. Save any survey changes first.</p><form id="authorization-form">${field('Customer / person authorizing the work','customer')}${field('Authorization date','date',new Date().toLocaleDateString('en-CA'),'date')}${text('Approval reference / notes','reference')}<label><input type="checkbox" name="confirmed"> I confirm the customer authorized this saved scope and it is ready for the field crew.</label><button>Authorize Job</button><p data-survey-feedback role="status" aria-live="polite"></p></form>`;sheet.append(panel);panel.querySelector('form').onsubmit=authorizeJob;}
 else if(job.status==='awaiting_authorization'){sheet.insertAdjacentHTML('beforeend','<p>Waiting for Isaiah or Cosme to confirm job authorization.</p>');}
}
async function save(event){event.preventDefault();try{await saveSurvey(event);}catch(error){busy=false;status(`Survey could not be submitted: ${error.message}`);root.querySelectorAll("#scope-form button").forEach(button=>button.disabled=false);root.querySelector("[data-survey-feedback]")?.scrollIntoView({block:"center"});}}
async function saveSurvey(event){if(busy){status("A save is already in progress. Please wait for it to finish.");return;}const form=event.currentTarget, state=event.submitter?.value||'draft';
 const data=new FormData(form),job={address:data.get('address').trim(),city:data.get('city').trim(),date:data.get('date'),locates:data.get('locates'),supplies:data.get('supplies'),notes:data.get('notes'),status:state,authorization:null,areas:[]};
 const pending=[];
 for(const box of form.querySelectorAll('[data-area]')){const read=n=>box.querySelector(`[name="${n}"]`)?.value??'';
  const area={id:box.dataset.area,...Object.fromEntries(['label','type','length','width','sunk','before','target','instructions'].map(n=>[n,read(n)])),gpsPoints:box.querySelector('[data-gps-editor]').readGpsPoints(),profile:readProfile(box.querySelector('[data-profile-editor]')),photos:selected.areas.find(a=>a.id===box.dataset.area)?.photos||[]};
  for(const file of box.querySelector('[name=photos]').files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){status('Photos must be JPEG, PNG, or WebP and no larger than 10 MB.');return;}pending.push({file,area});}job.areas.push(area);
 }
 if(state==='awaiting_authorization'){const invalid=[...form.querySelectorAll('input,textarea,select')].find(el=>!el.checkValidity());if(invalid){const label=invalid.getAttribute('aria-label')||invalid.closest('label')?.textContent?.trim()||'Survey field';status(label+': '+invalid.validationMessage);invalid.scrollIntoView({block:'center'});invalid.focus();return;}}
 const error=state==='awaiting_authorization'?validateScope(job):(!job.address?'Enter an address to save a draft.':'');if(error){status(error);root.querySelector("[data-survey-feedback]")?.scrollIntoView({block:"center"});return;}
 busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);const token=session, jobId=selected.id;
 try{status('Saving scope…');const current=await getDoc(doc(jobs,jobId));const revision=current.exists()?current.data().revision||0:0;
  if(revision!==(selected.revision||0))throw Error('Someone updated this job. Reopen it from the list before saving.');
  for(const {file,area} of pending){if(token!==session)throw Error('Sign-in changed. Reopen the job.');const path=`jobScopes/${appId}/${jobId}/${id()}`;const target=ref(storage,path);await uploadBytes(target,file,{contentType:file.type});area.photos.push({name:file.name,path,url:await getDownloadURL(target)});}
  if(token!==session)throw Error('Sign-in changed. Reopen the job.');
  await setDoc(doc(jobs,jobId),{...job,revision:revision+1,updatedAt:serverTimestamp(),updatedBy:auth.currentUser.email,...(!current.exists()?{createdAt:serverTimestamp(),createdBy:auth.currentUser.email}:{createdAt:current.data().createdAt,createdBy:current.data().createdBy})});
  selected={...job,id:jobId,revision:revision+1};open(selected);status(state==='awaiting_authorization'?'Survey submitted. It stays hidden from crews until Isaiah or Cosme authorizes the job.':'Draft saved.');
 }catch(err){status(`Save failed: ${err.message}`);}finally{busy=false;if(form.isConnected){form.querySelectorAll('button').forEach(b=>b.disabled=false);if(selected.status==='published')form.querySelector('[value=draft]').disabled=true;}}
}
async function authorizeJob(event){
 event.preventDefault();if(busy||!canAuthorize())return;
 const data=new FormData(event.currentTarget),a={customer:String(data.get('customer')||'').trim(),date:String(data.get('date')||''),reference:String(data.get('reference')||''),confirmed:data.get('confirmed')==='on'};
 const error=authorizationError(a);if(error){status(error);root.querySelector("[data-survey-feedback]")?.scrollIntoView({block:"center"});return;}
 if(root.querySelector('#scope-form')?.dataset.dirty==='true'){status('Save the survey changes before authorizing this scope.');return;}
 busy=true;try{const scopeError=validateScope(selected);if(scopeError)throw Error(scopeError);
 await setDoc(doc(jobs,selected.id),{status:'authorized',authorization:{...a,confirmedBy:auth.currentUser.email,confirmedAt:serverTimestamp()},revision:selected.revision+1,updatedAt:serverTimestamp(),updatedBy:auth.currentUser.email},{merge:true});
 const job={...selected,status:'authorized',authorization:{...a,confirmedBy:auth.currentUser.email},revision:selected.revision+1};open(job);status('Job authorized. It is now available to the field crew.');
 }catch(e){status(`Authorization failed: ${e.message}`);}finally{busy=false;}
}
onAuthStateChanged(auth,user=>{session++;stop?.();records=[];selected=null;manager=false;listSearch='';listFilter='active';listPage=1;shell();if(!user||!allowed.includes(user.email)){status('Sign in with an approved account to view jobs.');return;}manager=managers.includes(user.email);listFilter=manager?'active':'authorized';list();status('Loading jobs…');const source=manager?jobs:query(jobs,where('status','in',['authorized','completed']),where('authorization.confirmed','==',true));stop=onSnapshot(source,snap=>{records=snap.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.address.localeCompare(b.address));if(!manager&&selected){const current=records.find(j=>j.id===selected.id);if(!current||!crewVisible(current))backToJobs();else open(current);}list();if(root.querySelector('#jobs-status').textContent==='Loading jobs…')status('');},err=>status(`Jobs could not load: ${err.message}. The new Firebase rules must be installed before this section is available.`));});




