import assert from 'node:assert/strict';
import {addDays,validPoint,gddDailyF,dailyMap,sumSeason,sourceUrls,seasonalSnapshot} from '../lib/seasonal-heat.mjs';
function series(start,end,high=80,low=60,missing=''){
 const d={time:[],temperature_2m_max:[],temperature_2m_min:[]};
 for(let day=start;day<=end;day=addDays(day,1)){
  d.time.push(day);d.temperature_2m_max.push(day===missing?null:high);d.temperature_2m_min.push(day===missing?null:low);
 }
 return {timezone:'America/Detroit',daily_units:{temperature_2m_max:'°F',temperature_2m_min:'°F'},daily:d};
}
function run(){
 assert.equal(gddDailyF(80,60),20);
 assert.equal(gddDailyF(40,30),0);
 assert.equal(gddDailyF(40,50),null);
 assert.equal(gddDailyF(null,60),null);
 assert.equal(validPoint(43.6038,-83.9554),true);
 assert.equal(validPoint(43.6038,-122.0),false);
 const today='2026-11-01',now=new Date('2026-11-01T22:00:00Z'),cutoff=addDays(today,-12);
 assert.equal(cutoff,'2026-10-20');
 const all=series('2016-01-01','2026-10-20');
 const recent=series('2026-10-16','2026-11-01');
 // Full current season, compare a fixed baseline from 2016–2025.
 const out=seasonalSnapshot({archive:all,recent,lat:43.6038,lon:-83.9554,now,cutoffDate:cutoff});
 assert.equal(out.status,'AVAILABLE');
 assert.equal(out.seasonYear,2026);
 assert.equal(out.asOfDate,'2026-10-31');
 assert.equal(out.comparison.years.length,10);
 assert.equal(out.comparison.direction,'near-comparison');
 assert.equal(out.recentModeledDays,11);
 assert.equal(out.daily.at(-1).date,'2026-10-31');
 assert.equal(out.daily.at(-1).kind,'recent_weather_model');
 assert.ok(out.totalGdd50F>0);
 assert.match(out.method.limitations,/not a thermometer/);
 assert.equal(out.bloomStatus,'UNVERIFIED');
 // A missing date in newer model cannot be filled with an imaginary zero or a stale archive point.
 const gap=seasonalSnapshot({archive:all,recent:series('2026-10-16','2026-11-01',80,60,'2026-10-27'),
   now,lat:43.6038,lon:-83.9554,cutoffDate:cutoff});
 assert.equal(gap.status,'INCOMPLETE');
 assert.equal(gap.totalGdd50F,null);
 assert.equal(gap.comparison.differenceGdd50F,null);
 assert.equal(gap.missingDays,1);
 // Invalid units are not silently accepted, even when numbers look plausible.
 assert.throws(()=>dailyMap({...recent,daily_units:{temperature_2m_max:'°C',temperature_2m_min:'°C'}}));
 // New year resets accumulation. No November heat may be carried forward into January.
 const newYear=seasonalSnapshot({archive:series('2017-01-01','2026-12-20'),recent:series('2026-12-16','2027-01-01'),
   now:new Date('2027-01-01T17:00:00Z'),lat:43.6038,lon:-83.9554,cutoffDate:'2026-12-20'});
 assert.equal(newYear.status,'PENDING_FIRST_COMPLETE_DAY');
 assert.equal(newYear.totalGdd50F,null);
 const urls=sourceUrls(43.6038,-83.9554,today);
 const u=new URL(urls.archiveUrl),f=new URL(urls.recentUrl);
 assert.equal(u.hostname,'archive-api.open-meteo.com');
 assert.equal(u.searchParams.get('models'),'era5_land');
 assert.equal(u.searchParams.get('start_date'),'2016-01-01');
 assert.equal(f.searchParams.get('past_days'),'16');
 assert.throws(()=>sourceUrls(90,0,today));
 console.log('Seasonal heat: exact local days, 10-year comparison, missing evidence, source validation and rollover passed.');
}
run();
