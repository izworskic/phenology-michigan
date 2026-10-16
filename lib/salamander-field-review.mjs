// Human editorial gate for public migration reports.
// Never promote an unreviewed Jotform entry, iNaturalist species observation or forecast.
// A source-reviewed event is an audited report, NOT a validated migration-probability label.
import {reviewedMigration} from './salamander-observations.mjs';
import {REGIONS,shiftDate} from './salamanders.mjs';
const dateOk=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const YOUNGEST='2019-03-01';
const REGION_IDS=new Set(REGIONS.map(r=>r.id));
const BLOCKED_TEXT=/(?:\bGPS\b|\bcoordinates?\b|\blat(?:itude)?\b|\blon(?:gitude)?\b|\b\d{1,4}\s*(?:street|st\.|road|rd\.|drive|dr\.|avenue|ave\.|route|highway|hwy)\b|[-+]?\d{2}\.\d{3,}|(?:crossing|pool|breeding site)\s+(?:at|near|behind|beside|on)\b)/i;
const REPORT_TERMS=/(?:migrat(?:ion|ing|ed|e)|moving|movement|cross(?:ed|ing)|travel(?:ing|led)|toward breeding)/i;
export function localNowDate(now=new Date()){const vals=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const p=k=>vals.find(v=>v.type===k).value;return p('year')+'-'+p('month')+'-'+p('day');}
export function reviewFieldReport(input,archive,now=new Date()){
 const today=localNowDate(now);
 const go=(ok,msg)=>{if(!ok)throw Error(msg);};
 go(input?.ownerApproved===true&&input?.dateChecked===true&&input?.sourceChecked===true&&input?.privacyChecked===true,'Owner source/date/privacy signoff required');
 go(REGION_IDS.has(input.regionId),'Unrecognized broad Michigan region');
 go(dateOk(input.observedOn)&&input.observedOn>=YOUNGEST&&input.observedOn<=today,'Invalid or future observed date');
 go(input.observedOn.slice(5)>='03-01'&&input.observedOn.slice(5)<='05-31','Outside spring migration window');
 go(['direct_field_monitoring','institutional_report'].includes(input.method),'Invalid evidence method');
 const organization=String(input.organization||'').trim(),summary=String(input.summary||'').trim(),excerpt=String(input.sourceExcerpt||'').trim();
 go(organization.length>=4&&organization.length<=100&&!BLOCKED_TEXT.test(organization),'Organization is missing or contains location-sensitive information');
 go(summary.length>=25&&summary.length<=240&&!BLOCKED_TEXT.test(summary),'Use a short general-region summary with no directions, habitat sites or coordinates');
 go(excerpt.length>=30&&excerpt.length<=600&&REPORT_TERMS.test(excerpt),'Editor must read a dated original source explicitly describing movement');
 go(!BLOCKED_TEXT.test(excerpt),'Do not put exact sites or private coordinates in the review excerpt');
 let u;try{u=new URL(String(input.sourceUrl||''));}catch{}
 go(u?.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname.length>=5&&
  /^[a-z0-9.-]+$/i.test(u.hostname)&&String(input.sourceUrl).length<=600,
 'Source must be a direct public HTTPS article without query strings, fragments or credentials');
 const record={type:'migration_observed',regionId:input.regionId,observedOn:input.observedOn,
  reviewedOn:today,organization,summary,sourceUrl:u.toString(),method:input.method,
  verification:'source_reviewed',privacy:'regional_only'};
 go(reviewedMigration([record],today).length===1,'Source host is not on independently approved institutional allowlist, or report failed privacy validation');
 const existing=reviewedMigration(Array.isArray(archive)?archive:[],today);
 go(existing.length===(Array.isArray(archive)?archive.length:0),'Existing reviewed archive has invalid records; refuse overwrite');
 go(!existing.some(r=>r.sourceUrl===record.sourceUrl&&r.observedOn===record.observedOn&&r.regionId===record.regionId),'Duplicate event');
 go(existing.length<200,'Review ledger capacity reached; expand capacity with an audited migration');
 return [...existing,record].sort((a,b)=>b.observedOn.localeCompare(a.observedOn));
}
export function fieldEvidenceReadiness(records,day){
 const safe=reviewedMigration(records,day),years=new Set(safe.map(r=>r.observedOn.slice(0,4))),
 regions=new Set(safe.map(r=>r.regionId)),sources=new Set(safe.map(r=>r.sourceUrl));
 // This ledger contains positive movement only. Lack of a report ≠ a monitored negative night.
 // Forecast calibration requires independent, standardized monitored NEGATIVE nights too.
 const validatedNonMovementNights=0,standardizedMonitoringNights=0;
 const descriptive=safe.length>0;
 const enoughPositive=safe.length>=24&&years.size>=3&&regions.size>=4;
 const calibrationReady=enoughPositive&&validatedNonMovementNights>=24&&standardizedMonitoringNights>=48;
 return {sourceReviewedEvents:safe.length,years:years.size,regions:regions.size,
  independentSourcePages:sources.size,standardizedMonitoringNights,validatedNonMovementNights,
  calibrationReady,phase:calibrationReady?'eligible_for_held_out_evaluation':descriptive?'descriptive_archive':'collecting_evidence',
  explanation:'Source-reviewed movement events are positive-only reports. The absence of a report cannot be used as a no-migration label. Forecast scoring remains explicitly uncalibrated until comparable monitored non-movement nights, sufficient coverage, and held-out validation exist.'};
}
