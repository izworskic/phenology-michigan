import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fieldFinds,nearestSunriseHour,guideWeather} from '../lib/frostInterpretation.mjs';

const sunrise='2026-10-22T11:45:00.000Z';
const hour=(time,attrs={})=>({time,score:70,tempF:35,dewF:33,windMph:2,skyPct:15,visibilityMi:null,...attrs});
const sample={date:'2026-10-22',photo:{sunriseAt:sunrise},hourly:[
  hour('2026-10-22T10:00:00Z'),
  hour('2026-10-22T11:00:00Z'),
  hour('2026-10-22T12:00:00Z',{tempF:36,skyPct:23})]};
assert.equal(nearestSunriseHour(sample).time,'2026-10-22T12:00:00Z','Choose nearest valid hour around sunrise, not a stale evening value');
const guide=guideWeather(sample);
assert.equal(guide.available,true);
assert.match(guide.temperature,/near freezing/i);
assert.equal(guide.factors.length,4);
assert.equal(guide.factors.find(f=>f.id==='cold').value,'36°F forecast air');
assert.match(guide.factors.find(f=>f.id==='cold').explanation,/surface temperature/,'Do not invent a leaf temperature');
assert.equal(guide.caution,false);
const fog={...sample,hourly:[hour('2026-10-22T12:00:00Z',{tempF:29,dewF:28,visibilityMi:.5})]};
assert.equal(guideWeather(fog).caution,true,'Low visibility near freezing must trigger travel caution');
const windy={...sample,hourly:[hour('2026-10-22T12:00:00Z',{tempF:29,dewF:15,windMph:17,skyPct:95})]};
assert.match(guideWeather(windy).factors.find(f=>f.id==='wind').explanation,/mix/);
assert.match(guideWeather(windy).factors.find(f=>f.id==='moisture').condition,/drier/i);
const unavailable=guideWeather({...sample,photo:{sunriseAt:null}});
assert.equal(unavailable.available,false);
assert.equal(unavailable.factors.length,0);
assert.equal(guideWeather({...sample,hourly:[hour('2026-10-22T06:00:00Z')]}).available,false,'Distant sample cannot become sunrise observation');
for(const key of ['crystals','beads','rime','none']){
  assert.ok(fieldFinds[key].title&&fieldFinds[key].message&&fieldFinds[key].question,'Field clue must reveal a tangible observation and an open question');
}
assert.match(fieldFinds.rime.message,/fog droplets/i);
assert.match(fieldFinds.beads.message,/liquid/i);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('pages/frosty-mornings.js'),component=read('components/FrostFieldGuide.js'),css=read('public/frost-field-guide.css');
for(const token of ['FrostFieldGuide','field-guide','frost-field-guide.css','Questions to take into the field','How a landscape becomes a frost garden','What kind of frost did you find?'])assert.ok(page.includes(token),'Integrate field interpretation '+token);
for(const token of ['useState','aria-pressed','setStop','setClue','setFind','guideWeather','fieldFinds','onClick','NWS alerts','forecast','not a National Park Service publication'])assert.ok(component.includes(token),'Real visitor interaction and provenance '+token);
assert.ok(css.includes('@media(max-width:650px)'),'Guide must work on phones');
assert.ok(css.includes('.fg-stops button[aria-pressed=true]'),'Chosen stop needs visible state');
const original=read('pages/api/frosty-mornings.js');
assert.ok(original.includes('forecastGridData'),'Leave NWS grid pipeline intact');
assert.ok(page.includes('FAQPage')&&page.includes('canonical')&&page.includes('https://chrisizworski.com/#person'),'Preserve SEO identity and structured data');
console.log('Frost field-guide interpretation, interactive observations, near-sunrise data safety, missing-data honesty and SEO verified');
