// Real-browser acceptance test for the woodcock sky dance sound experience.
// Usage: BASE=http://localhost:3000 NODE_PATH=<playwright-core> CHROME_BIN=<chromium> node scripts/woodcock-sound-browser.cjs
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const BASE=(process.env.BASE||'http://localhost:3000').replace(/\/$/,'');
const CHROME=process.env.CHROME_BIN||['/opt/pw-browsers/chromium','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
const SHOTS=process.env.SHOTS||'';
const audio=p=>p.evaluate(()=>{const a=document.querySelector('audio.wsx-engine');return {src:a.getAttribute('src')||'',paused:a.paused,t:a.currentTime};});
const playingSrc=(p,re,min=0.3)=>p.waitForFunction(([r,m])=>{const a=document.querySelector('audio.wsx-engine');return a&&new RegExp(r).test(a.getAttribute('src')||'')&&!a.paused&&a.currentTime>m;},[re,min],{timeout:15000});
const birdTransform=p=>p.evaluate(()=>document.querySelector('.wsx-bird').getAttribute('transform'));

async function run(browser,label,opts){
  const ctx=await browser.newContext(opts);
  const page=await ctx.newPage();
  const errors=[],audioReq=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/woodcock-media\/.*\.mp3/.test(r.url()))audioReq.push(r.url());});
  await page.route(/googlesyndication|googletagmanager|doubleclick|network-ads-v1|cartocdn|carto\.com|api\.weather\.gov/,r=>r.abort());
  await page.goto(BASE+'/woodcock-sky-dance',{waitUntil:'load'});
  await page.waitForTimeout(1200);
  assert.equal(audioReq.length,0,label+': nothing loads or plays before Play');
  assert.equal(await page.locator('audio').count(),1,label+': one shared audio element');
  const section=page.locator('#listen');
  // Layout: the sky dance is the hero, the forecast follows, the jump nav reaches every section.
  const top=id=>page.evaluate(i=>document.getElementById(i).getBoundingClientRect().top+scrollY,id);
  assert.ok(await top('listen')<await top('forecast'),label+': sky dance leads the page');
  assert.ok(await top('forecast')<await top('map')&&await top('map')<await top('name-that-sound')&&await top('name-that-sound')<await top('field-guide'),label+': section order');
  assert.equal(await page.locator('#listen .wsx-diagram').count(),1);assert.equal(await page.locator('.woodcock-flight').count(),0,label+': old static illustration removed');
  assert.equal(await page.locator('.wsx-jump a').count(),7);
  for(const href of await page.locator('.wsx-jump a').evaluateAll(a=>a.map(x=>x.getAttribute('href'))))assert.equal(await page.locator(href).count(),1,label+': jump target '+href);
  assert.equal(await page.locator('#where').count(),1);assert.equal(await page.locator('#how-to').count(),1);
  assert.match(await page.locator('.wsx-teaser').textContent(),/Plan your evening/);
  // Stage labels and sources
  for(const [id,src] of [['peent','Vocal'],['twitter','Made by wing feathers'],['chirp','Vocal']])
    assert.match(await page.locator('#wsx-'+id+' .wsx-source').textContent(),new RegExp(src),label+': '+id+' source label');
  // Photos load
  for(const img of await page.locator('#field-guide img').all()){await img.scrollIntoViewIfNeeded();}
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#field-guide img').count(),2);
  const broken=await page.evaluate(()=>[...document.querySelectorAll('#field-guide img')].filter(i=>!(i.complete&&i.naturalWidth>0)).map(i=>i.src));
  assert.deepEqual(broken,[],label+': photos load');
  // 1. Peent plays; the ground marker is active.
  const peentBtn=page.locator('#wsx-peent .wsx-play');
  await peentBtn.scrollIntoViewIfNeeded();await peentBtn.click();
  await playingSrc(page,'peent\\.mp3$');
  assert.equal(await peentBtn.getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#wsx-peent').getAttribute('class'),/\bon\b/);
  // 2. Twitter replaces peent.
  await page.locator('#wsx-twitter .wsx-play').click();
  await playingSrc(page,'twitter\\.mp3$',0.8);
  assert.equal(await peentBtn.getAttribute('aria-pressed'),'false',label+': previous recording stopped');
  assert.match(await page.locator('#wsx-twitter').getAttribute('class'),/\bon\b/);
  const t1=await birdTransform(page);await page.waitForTimeout(900);const t2=await birdTransform(page);
  if(opts.reducedMotion==='reduce')assert.equal(t1,t2,label+': bird does not move with reduced motion');
  else assert.notEqual(t1,t2,label+': bird follows the twitter recording up the spiral');
  // 3. Pause, resume, replay.
  await page.locator('#wsx-twitter .wsx-play').click();await page.waitForTimeout(250);
  assert.equal((await audio(page)).paused,true,label+': pause');
  assert.match(await page.locator('#wsx-twitter .wsx-play').textContent(),/Resume/);
  await page.locator('#wsx-twitter .wsx-replay').click();
  await page.waitForFunction(()=>{const a=document.querySelector('audio.wsx-engine');return !a.paused&&a.currentTime<2;},null,{timeout:15000});
  // 4. Full performance: timeline playhead and stage sync from the annotations.
  const fullBtn=page.locator('.wsx-full .wsx-play');await fullBtn.scrollIntoViewIfNeeded();await fullBtn.click();
  await playingSrc(page,'sky-dance-full\\.mp3$');
  assert.equal(await page.locator('#wsx-twitter .wsx-play').getAttribute('aria-pressed'),'false');
  assert.match(await page.locator('#wsx-peent').getAttribute('class'),/\bon\b/,label+': full performance starts in the peent stage');
  await page.evaluate(()=>{document.querySelector('audio.wsx-engine').currentTime=22;});
  await page.waitForFunction(()=>document.querySelector('#wsx-twitter').classList.contains('on'),null,{timeout:5000});
  await page.evaluate(()=>{document.querySelector('audio.wsx-engine').currentTime=27.6;});
  await page.waitForFunction(()=>!!document.querySelector('.wsx-gap-note'),null,{timeout:5000});
  await page.evaluate(()=>{document.querySelector('audio.wsx-engine').currentTime=38;});
  await page.waitForFunction(()=>document.querySelector('#wsx-chirp').classList.contains('on'),null,{timeout:5000});
  assert.ok(await page.locator('.wsx-playhead').count()===1);
  // 5. Keyboard: focus stays on the control while it animates, Space toggles.
  await fullBtn.focus();await page.keyboard.press('Space');await page.waitForTimeout(400);
  assert.equal((await audio(page)).paused,true,label+': keyboard pause');
  assert.equal(await page.evaluate(()=>document.activeElement&&document.activeElement.classList.contains('wsx-play')),true,label+': focus kept on the control');
  await page.keyboard.press('Enter');await playingSrc(page,'sky-dance-full\\.mp3$',0);
  // 5b. Tapping a numbered marker on the flight path plays that stage.
  const mk=page.locator('.wsx-marker[data-stage=chirp]');await mk.scrollIntoViewIfNeeded();await mk.click();
  await playingSrc(page,'chirp\\.mp3$');
  assert.match(await page.locator('#wsx-chirp').getAttribute('class'),/\bon\b/,label+': marker plays its stage');
  await page.locator('.wsx-marker[data-stage=peent]').focus();await page.keyboard.press('Enter');
  await playingSrc(page,'peent\\.mp3$',0.1);
  // 5c. Field guide "Hear it" buttons share the player.
  const hear=page.locator('#what-am-i-hearing .wsx-play').nth(1);await hear.scrollIntoViewIfNeeded();await hear.click();
  await playingSrc(page,'twitter\\.mp3$',0.1);
  // 5d. Name that sound: a snippet plays without revealing its stage, stops on its own, answers are graded.
  await page.locator('.wsx-quiz-start').scrollIntoViewIfNeeded();await page.locator('.wsx-quiz-start').click();
  assert.match(await page.locator('.wsx-quiz-meta').textContent(),/Sound 1 of 5/);
  await page.locator('.wsx-mystery .wsx-play').click();
  await page.waitForFunction(()=>{const a=document.querySelector('audio.wsx-engine');return !a.paused&&a.currentTime>0;},null,{timeout:15000});
  assert.equal(await page.locator('.wsx-card.on').count(),0,label+': quiz does not give away the stage');
  await page.waitForFunction(()=>document.querySelector('audio.wsx-engine').paused,null,{timeout:15000});
  assert.match(await page.locator('.wsx-mystery .wsx-play').textContent(),/Hear it again/,label+': snippet stops by itself');
  const truth=await page.evaluate(()=>{const a=document.querySelector('audio.wsx-engine'),s=a.getAttribute('src'),t=a.currentTime;
    if(/peent/.test(s))return 'peent';if(/twitter/.test(s))return 'twitter';if(/chirp/.test(s))return 'chirp';return t<19.6?'peent':t<28.3?'twitter':'chirp';});
  await page.locator('.wsx-choice[data-answer='+truth+']').click();
  assert.match(await page.locator('.wsx-quiz-feedback').textContent(),/Yes!/,label+': correct answer graded');
  assert.match(await page.locator('.wsx-quiz-meta').textContent(),/Score 1/);
  await page.locator('.wsx-quiz-next').click();
  assert.match(await page.locator('.wsx-quiz-meta').textContent(),/Sound 2 of 5/);
  // 6. Visible error when a recording cannot load.
  await page.route('**/woodcock-media/chirp.mp3',r=>r.fulfill({status:404,body:'missing'}));
  await page.locator('#wsx-chirp .wsx-play').scrollIntoViewIfNeeded();await page.locator('#wsx-chirp .wsx-play').click();
  await page.locator('#wsx-chirp .wsx-error').waitFor({timeout:15000});
  assert.match(await page.locator('#wsx-chirp .wsx-error').textContent(),/could not/i);
  await page.unroute('**/woodcock-media/chirp.mp3');
  // 7. Every recording is served as audio.
  for(const f of ['peent','twitter','chirp','sky-dance-full']){const r=await page.request.get(BASE+'/woodcock-media/'+f+'.mp3');assert.equal(r.status(),200);assert.match(r.headers()['content-type']||'',/audio\/mpeg/);}
  // 8. Existing tool intact.
  assert.equal(await page.locator('#forecast').count(),1);assert.equal(await page.locator('#map').count(),1);
  assert.equal(await page.locator('#woodcock-region option').count(),9,label+': nine regions');
  assert.ok(await page.locator('#woodcock-access-atlas').count()>=1,label+': viewing atlas');
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://phenology.chrisizworski.com/woodcock-sky-dance');
  assert.ok(await page.locator('a[href="https://www.allaboutbirds.org/guide/American_Woodcock/sounds"]').count()>=1,'Cornell reference link');
  // 9. Layout
  const ov=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(ov<=1,label+': no sideways scroll ('+ov+')');
  const tap=await page.evaluate(()=>[...document.querySelectorAll('#listen .wsx-play')].every(b=>b.getBoundingClientRect().height>=44));
  assert.ok(tap,label+': play controls at least 44 px tall');
  assert.deepEqual(errors,[],label+': no page errors');
  if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.evaluate(()=>document.querySelector('audio.wsx-engine').pause());await section.screenshot({path:SHOTS+'/'+label+'.png'});}
  console.log('ok',label);
  await ctx.close();
}
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  await run(browser,'phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await run(browser,'desktop',{viewport:{width:1280,height:900}});
  await run(browser,'reduced-motion',{viewport:{width:1280,height:900},reducedMotion:'reduce'});
  await browser.close();
  console.log('Woodcock sound browser test passed: stages, single player, pause/replay, annotated full performance, keyboard, errors, reduced motion, layout, existing tool intact.');
})().catch(e=>{console.error(e);process.exit(1);});
