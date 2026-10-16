// Woodcock sky dance media gate: every enabled audio control is a real, licensed,
// locally hosted recording whose stage label matches the sound; photos are credited;
// the sound experience respects reduced motion and the existing tool stays wired up.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root));
const text=async p=>(await read(p)).toString('utf8');
const m=JSON.parse(await text('data/woodcock-media.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const ALLOWED=new Set(['cc0','cc-by','public-domain']);

// --- Audio ---------------------------------------------------------------
assert.deepEqual(Object.keys(m.audio).sort(),['chirp','full','peent','twitter']);
let ffmpeg=true;try{execFileSync('ffmpeg',['-version'],{stdio:'ignore'});}catch{ffmpeg=false;}
function pcm(path){
  const b=execFileSync('ffmpeg',['-v','error','-i',path,'-ac','1','-ar','22050','-f','s16le','-'],{maxBuffer:64*1024*1024});
  const x=new Float32Array(b.length/2);for(let i=0;i<x.length;i++)x[i]=b.readInt16LE(i*2)/32768;return x;
}
// Duty cycle: fraction of 50 ms frames carrying at least 10% of the clip's loud-frame
// (95th percentile) high-frequency energy. Discrete peents are sparse (about 0.1);
// the wing twitter and the chirping descent are sustained (0.6 to 0.9).
function highBandActivity(x){
  const frame=1102,out=[];
  for(let i=0;i+frame<=x.length;i+=frame){
    let e=0;for(let j=i+1;j<i+frame;j++){const d=x[j]-x[j-1];e+=d*d;} // first difference emphasises the 3-8 kHz sounds
    out.push(e/frame);
  }
  const s=[...out].sort((a,b)=>a-b),p95=s[Math.floor(s.length*0.95)];
  return out.filter(v=>v>p95*0.1).length/out.length;
}
const activity={};
for(const [key,a] of Object.entries(m.audio)){
  for(const f of ['src','file','credit','recordist','license','licenseUrl','sourceUrl','originalUrl','identification','modified','format'])assert.ok(a[f],key+'.'+f+' documented');
  assert.ok(ALLOWED.has(a.license),key+': licence must allow commercial hosting (got '+a.license+')');
  assert.equal(a.format,'audio/mpeg');
  assert.match(a.src,/^\/woodcock-media\/[a-z-]+\.mp3$/,key+': local asset, not a remote embed');
  assert.match(a.sourceUrl,/^https:\/\/www\.inaturalist\.org\/observations\/\d+$/);
  if(a.license==='cc-by')assert.match(a.credit,/CC BY/,key+': CC BY credit names the licence');
  const b=await read('public'+a.src);
  assert.equal(sha(b),a.sha256,key+' hash');assert.equal(b.length,a.bytes);
  assert.ok(b.length<800*1024,key+' under 800 KB');
  let frames=0;for(let i=0;i<b.length-1&&frames<40;i++)if(b[i]===0xff&&(b[i+1]&0xe0)===0xe0)frames++;
  assert.ok(frames>=40,key+' contains MPEG audio frames');
  if(ffmpeg){
    const x=pcm(new URL('public'+a.src,root).pathname);
    assert.ok(Math.abs(x.length/22050-a.durationSec)<0.6,key+' duration matches manifest');
    let s=0,peak=0;for(const v of x){s+=v*v;if(Math.abs(v)>peak)peak=Math.abs(v);}
    assert.ok(10*Math.log10(s/x.length)>-45&&peak>0.05,key+' is real sound, not silence');
    activity[key]=highBandActivity(x);
  }
}
// Stage labels match the sounds.
assert.equal(m.audio.peent.stage,'peent');assert.equal(m.audio.twitter.stage,'twitter');assert.equal(m.audio.chirp.stage,'chirp');
assert.equal(m.audio.twitter.voice,'wing','Twitter is labelled as a wing (mechanical) sound');
assert.equal(m.audio.peent.voice,'vocal');assert.match(m.audio.chirp.voice,/^vocal/);
if(ffmpeg){
  assert.ok(activity.peent<0.3,'peent clip is discrete notes with silence between ('+activity.peent.toFixed(2)+')');
  assert.ok(activity.twitter>0.45,'twitter clip is a sustained high-frequency sound ('+activity.twitter.toFixed(2)+')');
  assert.ok(activity.chirp>0.45,'chirp clip is sustained high-frequency sound ('+activity.chirp.toFixed(2)+')');
  assert.ok(activity.twitter>activity.peent+0.3&&activity.chirp>activity.peent+0.3,'peent is clearly sparser than twitter and chirps');
}
// Peent onsets are inside their files.
for(const k of ['peent','full']){const on=m.audio[k].peentOnsets;assert.ok(on.length>=4);for(const t of on)assert.ok(t>=0&&t<m.audio[k].durationSec);}
// Full performance annotations: contiguous, ordered, cover the file, and disclose the edit.
const seg=m.audio.full.segments;
assert.deepEqual(seg.map(s=>s.stage),['peent','twitter','gap','chirp']);
assert.equal(seg[0].start,0);
for(let i=1;i<seg.length;i++)assert.equal(seg[i].start,seg[i-1].end,'segments are contiguous');
assert.ok(Math.abs(seg.at(-1).end-m.audio.full.durationSec)<0.6,'segments cover the recording');
assert.match(seg[2].label,/removed by the recordist/);
assert.match(m.audio.full.recordistNote,/removed about 40 seconds/);
assert.ok(m.audio.full.peentOnsets.every(t=>t<seg[1].start),'peents are annotated only in the ground stage');

// --- Photos --------------------------------------------------------------
function webpSize(b){
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
  const k=b.toString('ascii',12,16);
  if(k==='VP8 ')return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
  if(k==='VP8L'){const v=b.readUInt32LE(21);return [(v&0x3fff)+1,((v>>14)&0x3fff)+1];}
  if(k==='VP8X')return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
  throw new Error('WebP '+k);
}
for(const [key,p] of Object.entries(m.photos)){
  for(const f of ['photographer','credit','license','licenseUrl','sourceUrl','originalUrl','alt','identification'])assert.ok(p[f],key+' photo '+f);
  assert.ok(ALLOWED.has(p.license));assert.ok(p.alt.length>=40,key+' descriptive alt');
  for(const k of ['src','srcSmall']){
    assert.match(p[k],/^\/woodcock-media\/[a-z-]+\.webp$/);
    const b=await read('public'+p[k]);assert.equal(sha(b),p.sha256[k]);assert.deepEqual(webpSize(b),p[k+'Size']);
    assert.ok(b.length<=200*1024,key+' '+k+' optimised');
  }
}
assert.match(m.photos.flight.captionNote,/not documented as a display flight/,'Flight photo is not presented as a display-flight photo');

// --- Component and page --------------------------------------------------
const comp=await text('components/WoodcockSoundExperience.js');
const page=await text('pages/woodcock-sky-dance.js');
const css=await text('public/woodcock.css');
assert.equal((comp.match(/<audio ref=/g)||[]).length,1,'one shared audio element');
assert.match(comp,/preload="none"/);assert.doesNotMatch(comp,/autoPlay|autoplay=/i);
assert.match(comp,/prefers-reduced-motion: reduce/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.wsx-wing/);
assert.match(comp,/allaboutbirds\.org\/guide\/American_Woodcock\/sounds/,'Cornell reference stays linked');
for(const label of ['Peent','Twitter','Chirp','On the ground','Spiraling into the sky','Descending home','Made by wing feathers','Experience the full sky dance','What am I hearing in the woods?'])assert.ok(comp.includes(label),label);
assert.ok(page.includes('<WoodcockSoundExperience/>'));
for(const keep of ['<WoodcockCartoMap','<WoodcockViewingFinder','/api/woodcock','NightChart','https://phenology.chrisizworski.com/woodcock-sky-dance','application/ld+json','FlightArt'])assert.ok(page.includes(keep),'existing page feature intact: '+keep);
console.log('Woodcock media: 4 recordings ('+(ffmpeg?'decoded, stage-checked':'structure only')+'), 2 photos, licences, annotations and page integration verified.');
