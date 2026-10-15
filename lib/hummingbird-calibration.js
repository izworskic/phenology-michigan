// Derive a descriptive reporting benchmark from the archived iNaturalist sample.
// This is never a predicted first arrival or a biological phenology threshold.
// Archive rows: [observed_on ISO date, nearest region id, public observer id, observation id].
const DAY=86400000;
const VALID=/^\d{4}-\d\d-\d\d$/;
const ordinal=iso=>{
 if(!VALID.test(iso||''))return null;
 const day=Date.parse('2025-'+iso.slice(5)+'T12:00:00Z');
 return Number.isFinite(day)?Math.round((day-Date.parse('2025-01-01T12:00:00Z'))/DAY)+1:null;
};
export function ordinalToMonthDay(d){
 if(!Number.isFinite(d)||d<1||d>365)return null;
 return new Date(Date.UTC(2025,0,d,12)).toISOString().slice(5,10);
}
const percentile=(v,p)=>{
 if(!v.length)return null;
 const sorted=[...v].sort((a,b)=>a-b);
 // Nearest ranked sample; we intentionally do not imply sub-day precision.
 return sorted[Math.floor((sorted.length-1)*p)];
};
export function calibrateHistory(snapshot,regionIds){
 if(!snapshot||!Array.isArray(snapshot.years))throw Error('Historical snapshot unavailable');
 const years=snapshot.years;
 return Object.fromEntries(regionIds.map(id=>{
  const annual=years.map(y=>{
   const obs=(y.observations||[]).filter(a=>a[1]===id&&VALID.test(a[0]||'')).sort((a,b)=>a[0].localeCompare(b[0]));
   const observers=new Set(obs.map(r=>r[2]).filter(v=>v!==null&&v!==undefined));
   // A year is suitable for an onset benchmark only when at least two independent reporters contributed.
   const sufficient=obs.length>=2&&observers.size>=2;
   return {year:y.year,reports:obs.length,reporters:observers.size,firstReported:sufficient?obs[0][0]:null,
     firstDoy:sufficient?ordinal(obs[0][0]):null};
  });
  const usable=annual.map(a=>a.firstDoy).filter(Number.isFinite);
  const reportCount=annual.reduce((n,a)=>n+a.reports,0);
  const yearsWithReports=annual.filter(a=>a.reports>0).length;
  const supportedYears=usable.length;
  // Descriptive data-coverage tiers; not statistical model validation.
  const coverage=supportedYears>=6&&reportCount>=40?'moderate':supportedYears>=4&&reportCount>=20?'limited':'insufficient';
  // Limited regions are shown as counts only; prevent unstable or northward-inverted date claims.
  const publish=coverage==='moderate';
  return [id,{
    label:publish?'Historical first reported sightings':coverage==='limited'?'Limited reporting history — dates withheld':'Insufficient historical reporting',
    coverage,reportCount,yearsWithReports,supportedYears,
    archiveYears:years.length,yearRange:years[0]?.year+'–'+years[years.length-1]?.year,
    firstReportEarly:publish?ordinalToMonthDay(percentile(usable,.2)):null,
    firstReportMedian:publish?ordinalToMonthDay(percentile(usable,.5)):null,
    firstReportLate:publish?ordinalToMonthDay(percentile(usable,.8)):null,
    annual:annual.map(({year,reports,reporters,firstReported})=>({year,reports,reporters,firstReported})),
    explanation:!publish?
      'Regional archive is too sparse for a dependable reporting-date benchmark. Regional feeder planning dates remain unchanged.':
      '20th–80th percentiles of the first observed research-grade public report for years with at least two different observers. This measures reporting onset, not first biological arrival; it is not a calibrated probability interval.',
  }];
 }));
}
