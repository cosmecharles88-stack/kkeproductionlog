const columns=['neBefore','neTarget','swBefore','swTarget'];
const names=['North/East Before','North/East Target','South/West Before','South/West Target'];
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function buildStations(length,interval,old=[]){
 length=Number(length);interval=Number(interval);
 if(!Number.isFinite(length)||length<0||!Number.isFinite(interval)||interval<=0||Math.floor(length/interval)>500)throw Error('Use a nonnegative total length and a positive interval (maximum 501 stations).');
 const byStation=new Map(old.map(r=>[Number(r.station),r]));
 return Array.from({length:Math.floor(length/interval)+1},(_,i)=>{const station=Number((i*interval).toFixed(6));return {station,...Object.fromEntries(columns.map(k=>[k,byStation.get(station)?.[k]??'']))};});
}
export function profileTable(rows,editable=false){return `<div class="scope-profile-wrap"><table class="scope-profile-table"><thead><tr><th rowspan="2">Station</th><th colspan="2">North/East Bound</th><th colspan="2">South/West Bound</th></tr><tr><th>Before</th><th>Target</th><th>Before</th><th>Target</th></tr></thead><tbody>${rows.map(r=>`<tr data-station="${escape(r.station)}"><th scope="row">${escape(r.station)} ft</th>${columns.map((k,i)=>`<td>${editable?`<input type="number" step="any" data-reading="${k}" value="${escape(r[k])}" aria-label="${names[i]} at ${escape(r.station)} feet">`:escape(r[k]===''||r[k]==null?'—':r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function readRows(host){return [...host.querySelectorAll('tbody tr')].map(row=>({station:Number(row.dataset.station),...Object.fromEntries(columns.map(k=>[k,row.querySelector(`[data-reading=${k}]`).value]))}));}
export function readProfile(host){return {length:host.querySelector('[data-profile-length]').value,interval:host.querySelector('[data-profile-interval]').value,units:host.querySelector('[data-profile-units]').value.trim(),rows:readRows(host)};}
export function mountProfile(host,profile={},length='100'){
 const initial=profile.rows||buildStations(profile.length??(Number(length)>0?length:100),profile.interval??10);
 host.innerHTML=`<h4>Profile readings (optional)</h4><p>Leave all readings blank if profiles are not needed for this area. If entering readings, include before/target pairs and units. Use the same station layout as the crew sheet. Target is the reading the crew should achieve. Leave an unused direction blank.</p><div class="jobs-grid"><label>Total Length (ft)<input type="number" min="0" step="any" data-profile-length value="${escape(profile.length??(Number(length)>0?length:100))}"></label><label>Interval (ft)<input type="number" min="0.01" step="any" data-profile-interval value="${escape(profile.interval??10)}"></label></div><label>Reading units / reference (required when entering readings)<input data-profile-units value="${escape(profile.units??'')}" placeholder="Example: inches below string line"></label><button type="button" data-build-profile>Build Table Rows</button><p data-profile-error role="status"></p><div data-profile-table>${profileTable(initial,true)}</div>`;
 host.querySelector('[data-build-profile]').onclick=()=>{const error=host.querySelector('[data-profile-error]');try{const p=readProfile(host);const rows=buildStations(p.length,p.interval,p.rows);const retained=new Set(rows.map(r=>r.station));if(p.rows.some(r=>!retained.has(r.station)&&columns.some(k=>r[k]!==''))){error.textContent='This length/interval would remove entered readings. Clear those readings first, or keep the existing station layout.';return;}host.querySelector('[data-profile-table]').innerHTML=profileTable(rows,true);error.textContent='';}catch(e){error.textContent=e.message;}};
}
export function validateProfile(p){
 // An entirely blank profile is optional. Zero is a real reading, not a blank.
 if(!p?.rows?.some(r=>columns.some(k=>r[k]!==''&&r[k]!=null)))return '';
 if(!p.units?.trim())return 'Enter the profile reading units / reference.';
 let expected;try{expected=buildStations(p.length,p.interval);}catch(e){return e.message;}
 if(expected.length!==p.rows.length||expected.some((r,i)=>r.station!==p.rows[i].station))return 'Build Table Rows to apply the current profile length and interval.';
 for(const row of p.rows){for(const [before,target] of [['neBefore','neTarget'],['swBefore','swTarget']]){
  const present=k=>row[k]!==''&&row[k]!=null;
  if(present(before)!==present(target))return 'Each entered before reading needs a target at the same station and direction.';
  if([before,target].some(k=>present(k)&&!Number.isFinite(Number(row[k]))))return 'Profile readings must be valid numbers.';
 }}return '';
}


