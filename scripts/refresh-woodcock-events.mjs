#!/usr/bin/env node
// Spring event refresh: GitHub Actions, no paid APIs, no private credentials.
// Source whitelisting + date/place/type gates prevent speculative event claims.
import {readFile,writeFile} from 'node:fs/promises';
import {MONITORED_SOURCES,fromTecEvent,extractStructuredEvents,fromStructuredEvent,
  findWoodcockDetailLinks,fallbackDetailEvent,mergeEvents} from '../lib/woodcock-spring-events.mjs';

const FILE=new URL('../data/woodcock-spring-events.json',import.meta.url);
const args=new Set(process.argv.slice(2));
const dryRun=args.has('--dry-run');
const current=new Date();
const autoYear=current.getUTCMonth()>=6?current.getUTCFullYear()+1:current.getUTCFullYear();
const year=Number(process.env.WOODCOCK_YEAR||autoYear);
if(!Number.isInteger(year)||year<2026||year>2040)throw new Error('Year outside supported spring range');
const now=current.toISOString();
const UA='MichiganPhenology-Woodcock-Events/1.0 (+https://phenology.chrisizworski.com/woodcock-sky-dance)';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const MAX_BYTES=1_800_000;
async function fetchPage(url,type='html') {
  const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':type==='json'?'application/json':'text/html,application/xhtml+xml;q=0.8'},signal:AbortSignal.timeout(11500),redirect:'follow'});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const bytes=Number(r.headers.get('content-length')||0);
  if(bytes>MAX_BYTES)throw new Error('Oversized official page');
  const text=await r.text();
  if(text.length>MAX_BYTES)throw new Error('Oversized official page');
  if(type==='json')return JSON.parse(text);
  if(!/<html|<script|<main|<body/i.test(text))throw new Error('Unexpected HTML');
  return text;
}
async function collectSource(source) {
  const candidates=[],links=new Set(),failures=[];
  let pagesRead=0,apiChecked=false;
  if(source.api) {
    try {
      const api=await fetchPage(source.api(year),'json');
      if(!Array.isArray(api.events))throw new Error('Missing event collection');
      apiChecked=true;pagesRead++;
      for(const item of api.events) {
        const event=fromTecEvent(item,source,year,now);
        if(event)candidates.push(event);
      }
      // API pagination: do not claim a complete calendar when pages are missing.
      const pages=Math.min(3,Math.max(1,Number(api.total_pages||1)));
      for(let p=2;p<=pages;p++) {
        await sleep(180);
        try {
          const next=await fetchPage(source.api(year)+'&page='+p,'json');
          if(!Array.isArray(next.events))throw new Error('Invalid API page');
          pagesRead++;
          for(const item of next.events) {
            const ev=fromTecEvent(item,source,year,now);
            if(ev)candidates.push(ev);
          }
        }catch(e){failures.push('API page '+p+': '+e.message);}
      }
    }catch(e){failures.push('API: '+e.message);}
  }
  // Independently inspect the official organizer calendar HTML. If the API goes away,
  // the site still has an intentionally bounded, low-cost HTML discovery path.
  for(const url of source.urls(year)) {
    try {
      await sleep(140);
      const html=await fetchPage(url);
      pagesRead++;
      for(const entry of extractStructuredEvents(html)) {
        const event=fromStructuredEvent(entry,source,year,now,url);
        if(event)candidates.push(event);
      }
      for(const link of findWoodcockDetailLinks(html,url,source))links.add(link);
    }catch(e){failures.push('Calendar: '+e.message);}
  }
  let detailsRead=0;
  for(const link of [...links].slice(0,source.maxCandidates)) {
    try {
      await sleep(170);
      const html=await fetchPage(link);
      detailsRead++;
      const embedded=extractStructuredEvents(html);
      let parsed=embedded.map(event=>fromStructuredEvent(event,source,year,now,link)).filter(Boolean);
      if(!parsed.length) {
        const fallback=fallbackDetailEvent(html,link,source,year,now);
        if(fallback)parsed=[fallback];
      }
      candidates.push(...parsed);
    }catch(e){failures.push('Event detail: '+e.message);}
  }
  const unique=[...new Map(candidates.map(e=>[e.id,e])).values()];
  const status=pagesRead===0?'unavailable':failures.length?'partial':'checked';
  return {events:unique,id:source.id,name:source.name,status,eventCount:unique.length,
    message:status==='unavailable'?'Organizer calendar could not be checked':status==='partial'?'Some source pages were unavailable':null,
    pagesRead,detailsRead,apiChecked};
}
const prior=await readFile(FILE,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
const results=[];
for(const source of MONITORED_SOURCES) {
  const info=await collectSource(source);
  results.push(info);
  console.log(source.name+': '+info.status+', '+info.eventCount+' dated events; '+info.pagesRead+' calendar/API pages, '+info.detailsRead+' details');
}
if(results.every(r=>r.status==='unavailable'))throw new Error('All official calendars unavailable. Preserving last successful published data.');
const events=results.flatMap(r=>r.events);
const document=mergeEvents(prior,events,year,results,now);
console.log('Candidate official spring walks:',JSON.stringify(document.events.map(e=>({date:e.date,title:e.title,source:e.source,url:e.url})),null,2));
if(dryRun){console.log('DRY RUN: nothing written');process.exit(0);}
await writeFile(FILE,JSON.stringify(document,null,2)+'\n','utf8');
console.log('Published event index for '+year+'; '+document.events.length+' entries. No unsupported venue or nighttime access claims.');
