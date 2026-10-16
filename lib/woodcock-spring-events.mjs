// Official-organizer event extraction. Pure functions: fixtures validate all gates.
// We publish dated spring walks only, never predicted dates, generic hunts or after-dark permission.
import {createHash} from 'node:crypto';

export const SPRING_MONTHS=[3,4,5,6];
export const MONITORED_SOURCES=[
  {id:'rgs',name:'Ruffed Grouse Society / American Woodcock Society',host:'ruffedgrousesociety.org',
    urls:y=>[3,4,5].map(m=>'https://ruffedgrousesociety.org/events/month/'+y+'-'+String(m).padStart(2,'0')+'/'),
    api:y=>'https://ruffedgrousesociety.org/wp-json/tribe/events/v1/events?start_date='+y+'-03-01&end_date='+y+'-06-15&per_page=100',
    maxCandidates:18},
  {id:'dahlem',name:'Dahlem Environmental Education Center',host:'dahlemcenter.org',
    urls:y=>[3,4,5].map(m=>'https://www.dahlemcenter.org/events/month/'+y+'-'+String(m).padStart(2,'0')+'/'),
    maxCandidates:6,defaultSiteId:'dahlem'},
  {id:'conservancy',name:'Little Traverse Conservancy',host:'landtrust.org',
    urls:y=>['https://landtrust.org/events/'],maxCandidates:8},
  {id:'belle-isle',name:'Belle Isle Nature Center',host:'belleislenaturecenter.org',
    urls:y=>['https://belleislenaturecenter.org/event-listing/'],maxCandidates:8,defaultSiteId:'belle-isle'},
  {id:'portage',name:'City of Portage Parks & Recreation',host:'portagemi.gov',
    urls:y=>['https://portagemi.gov/976/Programs-Events'],maxCandidates:6}
];

export function plainText(value='') {
  return String(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&(?:nbsp|#160);/gi,' ').replace(/&amp;/gi,'&')
    .replace(/&(?:mdash|ndash);/gi,'-').replace(/&#(?:39|x27);|&apos;/gi,"'")
    .replace(/&quot;|&#34;/gi,'"').replace(/\s+/g,' ').trim();
}
export function asSpringDate(raw,year) {
  if(!raw)return null;
  const value=String(raw);
  const m=value.match(/\b(20\d{2})-(\d{2})-(\d{2})/);
  if(!m||Number(m[1])!==year)return null;
  const mm=+m[2],dd=+m[3];
  if(mm<3||mm>6||dd<1||dd>31)return null;
  const iso=m[1]+'-'+m[2]+'-'+m[3];
  const check=new Date(iso+'T12:00:00Z');
  if(!Number.isFinite(check.getTime())||check.toISOString().slice(0,10)!==iso)return null;
  if(iso>year+'-06-15')return null;
  return iso;
}
export function normalizeEventTitle(s='') {return plainText(s).slice(0,180);}
export function woodcockWalk(title) {
  const s=normalizeEventTitle(title).toLowerCase();
  return /(woodcock|timberdoodle|sky.dance)/i.test(s)
    && /(walk|dance|courtship|watch|evening|night|outing|sky.dance)/i.test(s)
    && !/(hunt|shoot|banquet|fundrais|auction|tournament|raffle)/i.test(s);
}
export function matchKnownSite(text='') {
  const s=plainText(text).toLowerCase();
  const checks=[['lame-duck',/lame duck|bowmanville|lame duck truck trail/],
    ['gourdneck',/gourdneck/],['luton',/luton park|prairie overlook/],
    ['hailand',/hailand/],['dahlem',/dahlem/],
    ['belle-isle',/belle isle nature center|belle isle park/]];
  return checks.find(([,re])=>re.test(s))?.[0]||null;
}
export function isMichiganLocation(raw={},source) {
  if(source.id!=='rgs')return true; // Other calendars are Michigan-specific site operators.
  const place=plainText(raw.location||'').toLowerCase();
  const region=plainText(raw.region||'').toLowerCase();
  if(region==='mi'||region==='michigan')return true;
  if(/\b(michigan|mi\s+49\d{3}|mi\s+48\d{3})\b/.test(place))return true;
  // A document explicitly naming one known Michigan venue is sufficient.
  return Boolean(matchKnownSite(place));
}
export function eventUrl(url,source) {
  try {
    const u=new URL(url);
    if(u.protocol!=='https:')return null;
    const a=u.hostname.replace(/^www\./,'').toLowerCase();
    if(a!==source.host)return null;
    u.hash='';
    // Removing tracking parameters prevents duplicate event identities.
    for(const k of [...u.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/i.test(k))u.searchParams.delete(k);
    return u.toString();
  } catch {return null;}
}
export function normalizeEvent(raw,source,year,checkedAt) {
  const name=normalizeEventTitle(raw.name||raw.title);
  const date=asSpringDate(raw.startDate||raw.date,year);
  const url=eventUrl(raw.url,source);
  const venue=plainText(raw.venue||raw.location||'').slice(0,200);
  const region=plainText(raw.region||'');
  if(!name||!date||!url||!woodcockWalk(name)||!isMichiganLocation({location:venue,region},source))return null;
  const combined=name+' '+venue;
  // The event can be listed without a site pin if its specific venue isn't evidenced.
  let siteId=matchKnownSite(combined);
  if(!siteId&&source.defaultSiteId)siteId=source.defaultSiteId;
  const identity=createHash('sha256').update(source.id+'|'+date+'|'+url).digest('hex').slice(0,18);
  return {id:identity,title:name,date,venue:venue||'See organizer for meeting point',siteId,
    url,source:source.name,sourceId:source.id,lastSeenAt:checkedAt,
    status:'organizer-listed',access:'Follow organizer registration and after-hours access requirements'};
}
export function extractStructuredEvents(html) {
  const events=[];
  const tags=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  function visit(value,depth=0) {
    if(!value||depth>7)return;
    if(Array.isArray(value)){value.forEach(x=>visit(x,depth+1));return;}
    if(typeof value!=='object')return;
    const t=Array.isArray(value['@type'])?value['@type']:[value['@type']];
    if(t.some(v=>typeof v==='string'&&(v==='Event'||v.endsWith('/Event'))))events.push(value);
    if(value['@graph'])visit(value['@graph'],depth+1);
    if(value.event)visit(value.event,depth+1);
    if(value.subEvent)visit(value.subEvent,depth+1);
  }
  for(const [,txt] of tags){try{visit(JSON.parse(txt.trim()));}catch{}}
  return events;
}
export function fromStructuredEvent(event,source,year,checkedAt,pageUrl) {
  const loc=Array.isArray(event.location)?event.location[0]:event.location||{};
  const address=loc.address||{};
  const addr=typeof address==='string'?address:[address.streetAddress,address.addressLocality,address.addressRegion,address.postalCode].filter(Boolean).join(', ');
  return normalizeEvent({name:event.name,title:event.name,startDate:event.startDate,
    url:typeof event.url==='string'?event.url:pageUrl,
    venue:[loc.name,addr].filter(Boolean).join(', '),
    region:typeof address==='object'?address.addressRegion:''},source,year,checkedAt);
}
export function fromTecEvent(event,source,year,checkedAt) {
  const venue=event.venue||{};
  return normalizeEvent({title:plainText(event.title||event.name),date:event.start_date||event.startDate,
    url:event.url,venue:[venue.venue,venue.address,venue.city,venue.stateprovince,venue.zip].filter(Boolean).join(', '),
    region:venue.stateprovince||venue.state||''},source,year,checkedAt);
}
export function findWoodcockDetailLinks(html,indexUrl,source) {
  const links=[];
  const pattern=/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;
  for(const [,attrs,inside] of html.matchAll(pattern)) {
    const href=attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if(!href)continue;
    const link=eventUrl(new URL(href,indexUrl).href,source);
    if(!link||!woodcockWalk(plainText(inside)))continue;
    if(!links.includes(link))links.push(link);
  }
  return links.slice(0,source.maxCandidates);
}
export function fallbackDetailEvent(html,url,source,year,checkedAt) {
  const og=html.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const title=og||html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  if(!woodcockWalk(title||''))return null;
  // Restrict date matches to the event-detail text, not unrelated page footer calendars.
  const body=plainText(html.replace(/<footer\b[\s\S]*?<\/footer>/gi,'')).slice(0,6500);
  let date=body.match(new RegExp('\\b'+year+'-(?:03|04|05|06)-\\d{2}\\b'))?.[0];
  if(!date) {
    const m=body.match(new RegExp('\\b(March|April|May|June|Mar|Apr|Jun)\\s+(\\d{1,2}),?\\s+'+year+'\\b','i'));
    if(m){const idx=['jan','feb','mar','apr','may','jun'].indexOf(m[1].slice(0,3).toLowerCase());date=year+'-'+String(idx+1).padStart(2,'0')+'-'+String(+m[2]).padStart(2,'0');}
  }
  if(!date)return null;
  // RGS detail pages need explicit Michigan-place evidence. Never assume national organizer == Michigan.
  const venue=body.slice(0,3000);
  return normalizeEvent({title,date,url,venue,region:''},source,year,checkedAt);
}
export function mergeEvents(previous,newEvents,year,sourceResults,now) {
  const prior=previous?.year===year&&Array.isArray(previous.events)?previous.events:[];
  const map=new Map();
  for(const event of prior)if(event.date?.startsWith(String(year)+'-')&&event.status==='organizer-listed')map.set(event.id,event);
  for(const event of newEvents)map.set(event.id,event);
  const cutoff=now.slice(0,10);
  const events=[...map.values()].filter(e=>e.date>=cutoff&&e.date<=year+'-06-15')
    .sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title)).slice(0,60);
  return {schema:1,year,checkedAt:now,events,
    sources:sourceResults.map(s=>({id:s.id,name:s.name,status:s.status,eventCount:s.eventCount||0,
      ...(s.message?{message:s.message.slice(0,160)}:{})})),
    note:'Dates appear only when directly published on monitored organizer pages. Old events may remain if a source becomes temporarily unavailable; always verify final details and access at the linked organizer.'};
}
