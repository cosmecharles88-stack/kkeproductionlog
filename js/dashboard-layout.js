export function simplifyDashboard(){
 const dashboard=document.getElementById('dashboard');if(!dashboard||dashboard.dataset.organized)return;dashboard.dataset.organized='true';
 const style=document.createElement('style');style.textContent=`
 #dashboard .dashboard-section{margin:14px 0;padding:0;overflow:hidden}
 #dashboard .dashboard-section>summary{cursor:pointer;padding:18px 20px;font-weight:800;color:#003f7d;line-height:1.4}
 #dashboard .dashboard-section>summary .section-hint{display:block;font-size:13px;font-weight:400;color:#6b7280;margin-top:4px}
 #dashboard .dashboard-section-content{padding:0 16px 16px}
 #dashboard .dashboard-section-content>.card{box-shadow:none;margin:12px 0;border:1px solid #e5e7eb}
 #dashboard .dashboard-goal-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
 #dashboard .dashboard-goal-more{margin-top:16px;color:#003f7d}
 #dashboard .dashboard-goal-more>summary{cursor:pointer;font-weight:700;padding:8px 0}
 #dashboard .dashboard-goal-more .dashboard-goal-grid{margin-top:12px}
 #dashboard .dashboard-tool-actions{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0!important;justify-content:flex-start!important}
 #dashboard .dashboard-tool-actions button{margin:0!important}
 #dashboard .dashboard-section>summary:focus-visible{outline:3px solid #0057a8;outline-offset:-4px}
 #dashboard .dashboard-goal-header h2{font-size:24px}
 @media(max-width:750px){#dashboard .dashboard-goal-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:420px){#dashboard .dashboard-goal-grid{grid-template-columns:1fr}}
 `;document.head.append(style);
 const goal=document.getElementById('dashboardRevenueGoalCard'),overview=goal?.closest('.card');if(!overview)return;
 const heading=overview.querySelector('h2');if(heading)heading.textContent='Revenue overview';
 const note=overview.querySelector(':scope > .dashboard-note');if(note)note.textContent='Start with progress toward the monthly goal. Open the sections below for the supporting detail.';
 const title=dashboard.querySelector('.title-box h1');if(title)title.textContent='Revenue & Operations';
 const subtitle=dashboard.querySelector('.title-box > p:last-child');if(subtitle)subtitle.textContent='Monthly goal progress first. Operational details when you need them.';
 const section=(name,hint)=>{const el=document.createElement('details');el.className='card dashboard-section';const summary=document.createElement('summary');summary.textContent=name;const span=document.createElement('span');span.className='section-hint';span.textContent=hint;summary.append(span);const content=document.createElement('div');content.className='dashboard-section-content';el.append(summary,content);dashboard.append(el);return {el,summary,content};};
 const review=section('Needs attention','Reports waiting for review, corrections, or missing information.');
 const production=section('Production & efficiency','Pounds, meter differences, injection types, crews, trucks and cities.');
 const finance=section('Estimated costs & profit','Revenue, direct costs, overhead and the assumptions behind them.');
 const trends=section('Trends & comparisons','Previous month, daily snapshots, weekly and six-month trends.');
 const dispatch=section('Dispatch & travel','Time and GPS distance between jobs.');
 const tools=section('Manager tools','Exports, executive reports, meeting agenda and shared cost settings.');
 const moveCard=(id,target)=>{const el=document.getElementById(id);const card=el?.closest('.card');if(card&&card!==overview)target.content.append(card);};
 moveCard('flaggedReports',review);
 for(const id of ['dashBestTruck','dashMethodJobs','newServiceCitiesMetrics','cityMetrics','truckMetrics','workAreaMetrics','truckEfficiencyMetrics','crewMetrics'])moveCard(id,production);
 for(const id of ['monthOverMonthCard','dashYesterdayPounds','trendMetrics','weekOverWeekTrendMetrics','sixMonthTrendMetrics'])moveCard(id,trends);
 moveCard('transitionAnalyticsCard',dispatch);
 const productionGrid=document.getElementById('dashTotalClicks')?.closest('.grid');if(productionGrid)production.content.prepend(productionGrid);
 const pnlGrid=document.getElementById('dashRevenue')?.closest('.grid');if(pnlGrid)finance.content.append(pnlGrid);
 const quality=document.getElementById('dashCostQualityRead');if(quality)finance.content.append(quality);
 const actions=document.getElementById('btnGenerateExecutiveReport')?.parentElement;if(actions){actions.classList.add('dashboard-tool-actions');tools.content.append(actions);}
 const exportStatus=document.getElementById('photoZipExportStatus');if(exportStatus)tools.content.append(exportStatus);
 const settings=document.getElementById('costMonthlyRevenueGoal')?.closest('details');if(settings)tools.content.append(settings);
 // Show four primary figures; keep secondary pace numbers one click away.
 const grid=goal.querySelector('.dashboard-goal-grid');if(grid){const extra=document.createElement('details');extra.className='dashboard-goal-more';extra.innerHTML='<summary>See expected revenue, projection and remaining balance</summary><div class="dashboard-goal-grid"></div>';const extraGrid=extra.querySelector('div');
  for(const id of ['dashGoalExpected','dashGoalProjected','dashGoalRemaining','dashGoalStatusValue']){const card=document.getElementById(id)?.closest('.calc-box');if(card)extraGrid.append(card);}
  for(const id of ['dashGoalRevenue','dashGoalMonthly','dashGoalVariance','dashGoalNeededPerDay']){const card=document.getElementById(id)?.closest('.calc-box');if(card)grid.append(card);}goal.append(extra);
 }
 // Counts distinguish report records from customer jobs.
 for(const [id,label] of [['dashMethodJobs','Method Reports'],['dashDiJobs','DI Reports']]){const metric=document.getElementById(id)?.parentElement.querySelector('.calc-label');if(metric)metric.textContent=label;}
 const updateReview=()=>{const box=document.getElementById('flaggedReports');const count=box?.querySelectorAll('.flag-item').length||0;review.summary.firstChild.textContent=count?`Needs attention · ${count} flags`:'Needs attention';};
 const flagged=document.getElementById('flaggedReports');if(flagged){new MutationObserver(updateReview).observe(flagged,{childList:true,subtree:true});updateReview();}
}

