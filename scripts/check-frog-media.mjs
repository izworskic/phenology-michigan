// Frog media acceptance gate: every Play control and every photo on /frog-chorus
// must be backed by a real, licensed, correctly keyed local file.
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root));
const source=await readFile(new URL('lib/frogs.js',root),'utf8');
const {SPECIES}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const manifest=JSON.parse(await readFile(new URL('data/frog-media.json',root),'utf8'));

const ALLOWED={'public-domain':'Public domain','cc0':'CC0','cc-by':'CC BY'};
const ids=SPECIES.map(s=>s.id).sort();
assert.deepEqual(Object.keys(manifest.species).sort(),ids,'Manifest keys must match the 13 species ids in lib/frogs.js');
assert.equal(ids.length,13);

const sha=b=>createHash('sha256').update(b).digest('hex');
function webpSize(b){
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
  const kind=b.toString('ascii',12,16);
  if(kind==='VP8 ')return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
  if(kind==='VP8L'){const v=b.readUInt32LE(21);return [(v&0x3fff)+1,((v>>14)&0x3fff)+1];}
  if(kind==='VP8X')return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
  throw new Error('Unknown WebP chunk '+kind);
}
function mp3Frames(b){
  let i=0;
  if(b.toString('ascii',0,3)==='ID3')i=10+((b[6]&0x7f)<<21|(b[7]&0x7f)<<14|(b[8]&0x7f)<<7|(b[9]&0x7f));
  let frames=0;
  for(;i<b.length-4&&frames<50;i++){if(b[i]===0xff&&(b[i+1]&0xe0)===0xe0){frames++;}}
  return frames;
}
// Decoded audio check: the file decodes, lasts long enough to hear a call, is not
// silence, and is not clipped noise. Uses ffmpeg when present (CI images and dev
// machines); otherwise the structural MP3 checks above still apply.
let ffmpeg=true;try{execFileSync('ffmpeg',['-version'],{stdio:'ignore'});}catch{ffmpeg=false;}
function decodedStats(path){
  const pcm=execFileSync('ffmpeg',['-v','error','-i',path,'-ac','1','-ar','16000','-f','s16le','-'],{maxBuffer:64*1024*1024});
  const n=pcm.length/2;let sum=0,peak=0;
  for(let i=0;i<n;i++){const v=pcm.readInt16LE(i*2)/32768;sum+=v*v;const a=Math.abs(v);if(a>peak)peak=a;}
  return {seconds:n/16000,rmsDb:10*Math.log10(sum/n+1e-12),peak};
}

let photos=0,calls=0,bytes=0;
for(const sp of SPECIES){
  const m=manifest.species[sp.id];
  assert.equal(m.name,sp.name,sp.id+': manifest name must match the species name');
  // Photo
  const p=m.photo;assert.ok(p,sp.id+': photo entry required (or an honest missing-image treatment in the UI)');
  for(const k of ['src','srcSmall','alt','credit','license','licenseUrl','sourceUrl','originalUrl','photographer']) assert.ok(p[k],sp.id+' photo.'+k);
  assert.ok(ALLOWED[p.license],sp.id+': photo licence must be public domain, CC0 or CC BY (got '+p.license+')');
  assert.ok(p.alt.length>=25,sp.id+': descriptive alt text');
  for(const [key,src,w,h] of [['large',p.src,p.width,p.height],['small',p.srcSmall,p.widthSmall,p.heightSmall]]){
    assert.match(src,/^\/frog-media\/photos\/[a-z]+(-sm)?\.webp$/);
    const b=await read('public'+src);
    assert.equal(sha(b),p.sha256[key],sp.id+' '+key+' photo hash');
    assert.equal(b.length,p.bytes[key]);
    assert.deepEqual(webpSize(b),[w,h],sp.id+' '+key+' WebP dimensions match manifest');
    assert.ok(Math.abs(w/h-4/3)<0.02,sp.id+' '+key+' is cropped 4:3');
    assert.ok(b.length<=160*1024,sp.id+' '+key+' photo optimised (<=160 KB, got '+b.length+')');
    bytes+=b.length;
  }
  assert.ok(p.width>=440,sp.id+' large photo at least 440 px wide');
  photos++;
  // Audio
  const a=m.audio;assert.ok(a,sp.id+': verified recording required');
  for(const k of ['src','credit','license','licenseUrl','sourceUrl','originalUrl','recordist','identification']) assert.ok(a[k],sp.id+' audio.'+k);
  assert.ok(ALLOWED[a.license],sp.id+': audio licence must be public domain, CC0 or CC BY');
  assert.equal(a.format,'audio/mpeg');
  assert.match(a.src,/^\/frog-media\/audio\/[a-z]+\.mp3$/);
  const path=new URL('public'+a.src,root);
  const b=await read('public'+a.src);
  assert.equal(sha(b),a.sha256,sp.id+' audio hash');
  assert.equal(b.length,a.bytes);
  assert.ok(b.length<=700*1024,sp.id+' audio under 700 KB');
  assert.ok(mp3Frames(b)>=50,sp.id+': file contains MPEG audio frames');
  if(ffmpeg){
    const st=decodedStats(path.pathname);
    assert.ok(Math.abs(st.seconds-a.durationSec)<1,sp.id+' duration matches manifest');
    assert.ok(st.seconds>=3,sp.id+' long enough to hear a call');
    assert.ok(st.rmsDb>-45,sp.id+' is not silence ('+st.rmsDb.toFixed(1)+' dBFS)');
    assert.ok(st.peak<1.0001&&st.peak>0.05,sp.id+' has a real signal');
  }
  bytes+=b.length;calls++;
}
// USGS provenance for the 11 public-domain calls; iNaturalist only where USGS has none.
const usgs=SPECIES.filter(s=>manifest.species[s.id].audio.license==='public-domain').map(s=>s.id).sort();
assert.deepEqual(usgs,['bullfrog','chorus','copes','cricket','gray','green','leopard','mink','peeper','toad','wood']);
for(const id of ['pickerel','fowlers'])assert.match(manifest.species[id].audio.sourceUrl,/^https:\/\/www\.inaturalist\.org\/observations\/\d+$/);
// Protected species: credits never carry coordinates or locality.
for(const id of ['cricket','fowlers','pickerel'])assert.doesNotMatch(JSON.stringify(manifest.species[id]),/latitude|longitude|place_guess|county/i,id+': no locality in manifest');
// The page uses the shared player, not raw <audio controls> elements per card.
const page=await readFile(new URL('pages/frog-chorus.js',root),'utf8');
assert.doesNotMatch(page,/<audio\s+controls/,'Cards must use the shared single-player control');
assert.match(page,/FrogAudioProvider/);
assert.match(page,/Listen for these frogs|LISTEN FOR THESE FROGS/);
assert.match(page,/What frog am I hearing\?/);
const player=await readFile(new URL('components/FrogAudio.js',root),'utf8');
assert.match(player,/preload="none"/,'No audio preloading or autoplay');
assert.doesNotMatch(player,/autoPlay|autoplay=/i);
console.log(`Frog media: ${photos} photographs and ${calls} recordings verified (${Math.round(bytes/1024)} KB)${ffmpeg?', decoded audio checked':''}.`);
