import {validateProfile} from './profiles.js';
export const WORK_TYPES = ['Sidewalk','Street','Path','Alley','Curb and gutter','Park','Driveway','Turn lane','Longitudinal joint lift','Transverse joint lift','Pool deck','Warehouse','Other'];
export function validateScope(job) {
  if (!job.address?.trim() || !job.city?.trim()) return 'Address and city are required.';
  if (!job.areas?.length) return 'Add at least one work area.';
  for (const area of job.areas) {
    if (!area.label?.trim()) return 'Give each work area a label.';
    if ([area.length,area.width,area.sunk].some(x => x === '' || !Number.isFinite(Number(x)) || Number(x)<0)) return 'Enter valid nonnegative dimensions and amount sunk.';
    if (area.profile) { const error=validateProfile(area.profile); if(error) return error; }
    else if (!area.before?.trim() || !area.target?.trim()) return 'Enter before and target profiles for each area.';
  }
  return '';
}
