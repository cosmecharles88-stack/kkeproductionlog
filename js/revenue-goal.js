export function isCalendarMonth(range){if(!range?.start||!range?.end)return false;const s=range.start,e=range.end;return s.getDate()===1&&s.getHours()===0&&s.getMinutes()===0&&e.getDate()===1&&e.getHours()===0&&e.getMinutes()===0&&e.getFullYear()*12+e.getMonth()===s.getFullYear()*12+s.getMonth()+1;}
export function countWorkdays(start,end){let count=0;for(const d=new Date(start);d<end;d.setDate(d.getDate()+1))if(d.getDay()!==0&&d.getDay()!==6)count++;return count;}
export function revenueGoalProgress(summary,range,settings,now=new Date()){
 const goal=Math.max(0,Number(settings.monthlyRevenueGoal)||0),revenue=Number(summary?.revenue)||0;
 const base={goal,revenue,percent:goal?revenue/goal*100:0,expectedToDate:0,pacingVariance:0,projected:0,remaining:Math.max(0,goal-revenue),remainingWorkdays:0,requiredPerWorkday:0,elapsedWorkdays:0,totalWorkdays:0,supported:false,ended:false,started:false};
 if(!goal||!isCalendarMonth(range))return base;
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
 const cutoff=new Date(Math.max(+range.start,Math.min(+range.end,+tomorrow)));
 const totalWorkdays=countWorkdays(range.start,range.end),elapsedWorkdays=countWorkdays(range.start,cutoff),remainingWorkdays=countWorkdays(cutoff,range.end);
 const expectedToDate=goal*elapsedWorkdays/totalWorkdays,remaining=Math.max(0,goal-revenue),ended=today>=range.end;
 return {...base,supported:true,started:today>=range.start,ended,totalWorkdays,elapsedWorkdays,remainingWorkdays,expectedToDate,pacingVariance:revenue-expectedToDate,projected:ended?revenue:elapsedWorkdays?revenue/elapsedWorkdays*totalWorkdays:0,requiredPerWorkday:remainingWorkdays?remaining/remainingWorkdays:null};
}
