import INDEX from '../data/michigan-phenophase-archive-index.json' with {type:'json'};
import {archiveHealth,archiveHealthLabel} from '../lib/phenophase-archive-health.mjs';
const state=archiveHealth(INDEX,new Date());
const message=archiveHealthLabel(state)+': last real capture '+(state.asOf||'not available')
  +', Michigan date '+state.today+', days since last capture '+state.daysSince
  +', missed days within archive '+state.missingCollectionDays;
if(['overdue','stale','invalid','unknown'].includes(state.state)){
  console.error('::error title=Michigan Phenology collection overdue::'+message
    +'. Inspect the automatic USA-NPN/iNaturalist collection job and its source failures. No fabricated observations are allowed.');
  process.exitCode=1;
}else if(state.state==='partial'){
  console.warn('::warning title=Phenophase partial source coverage::'+message);
}else{
  console.log('PASS '+message);
}
