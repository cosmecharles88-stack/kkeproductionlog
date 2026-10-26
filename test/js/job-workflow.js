export const STATUS_LABELS={draft:'Draft survey',awaiting_authorization:'Awaiting authorization',authorized:'Authorized job',completed:'Completed',archived:'Archived',published:'Needs authorization review'};
export function crewVisible(job){return ['authorized','completed'].includes(job.status)&&job.authorization?.confirmed===true;}
export function authorizationError(a){return !a?.confirmed?'Confirm that the customer authorized this scope.':!a.customer?.trim()?'Enter who authorized the work.':!/^\d{4}-\d{2}-\d{2}$/.test(a.date||'')?'Enter the authorization date.':'';}
