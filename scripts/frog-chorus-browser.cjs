// Real-browser acceptance test for /frog-chorus media.
// Usage: BASE=http://localhost:3000 NODE_PATH=<playwright-core install> CHROME_BIN=<chromium> node scripts/frog-chorus-browser.cjs
// Optional: SHOTS=dir to save phone/desktop screenshots.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const BASE=(process.env.BASE||'http://localhost:3000').replace(/\/$/,'');
const CHROME=process.env.CHROME_BIN||['/opt/pw-browsers/chromium','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
const SHOTS=process.env.SHOTS||'';
const audioState=page=>page.evaluate(()=>{const a=document.querySelector('audio.frog-audio-engine');return {src:a.getAttribute('src')||'',paused:a.paused,t:a.currentTime};});
const pressed=(page,id)=>page.locator('#frog-'+id+' .frog-play').getAttribute('aria-pressed');

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const [label,viewport,mobile] of [['phone',{width:390,height:844},true],['desktop',{width:1280,height:900},false]]){
    const ctx=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,
      userAgent:mobile?'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36':undefined});
    const page=await ctx.newPage();
    const errors=[],audioRequests=[],badMedia=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.url().includes('/frog-media/audio/'))audioRequests.push(r.url());});
    page.on('response',r=>{if(r.url().includes('/frog-media/')&&r.status()>=400)badMedia.push(r.status()+' '+r.url());});
    // Ads and third-party map tiles are not under test here.
    await page.route(/googlesyndication|googletagmanager|doubleclick|network-ads-v1|basemaps\.cartocdn|carto\.com/,r=>r.abort());
    await page.goto(BASE+'/frog-chorus',{waitUntil:'load'});
    await page.waitForTimeout(1500);
    assert.equal(audioRequests.length,0,label+': no audio is fetched or played before a Play press');
    assert.equal(await page.locator('#frog-wood .frog-play').count(),1);
    assert.equal(await page.locator('.frog-species').count(),13,label+': all 13 species cards');

    // Every photo loads (scroll each into view so lazy images fetch).
    const imgs=page.locator('img.frog-photo');const n=await imgs.count();
    for(let i=0;i<n;i++){await imgs.nth(i).scrollIntoViewIfNeeded();}
    await page.waitForTimeout(1200);
    const broken=await page.evaluate(()=>[...document.querySelectorAll('img.frog-photo')].filter(i=>!(i.complete&&i.naturalWidth>0)).map(i=>i.getAttribute('src')));
    assert.deepEqual(broken,[],label+': every frog photo loads');
    assert.equal(await page.locator('.frog-photo-missing').count(),0,label+': no species falls back to the missing-photo treatment');

    // Off-season (October) preview: listen cards present, no claim of active calling.
    const panel=page.locator('.frog-panel-dark');
    const panelText=await panel.textContent();
    assert.match(panelText,/LISTEN FOR THESE FROGS/);
    const month=new Date().getUTCMonth()+1;
    if(month>=10||month<=1){assert.match(panelText,/Off-season preview|No Michigan frogs are in their calling window/,'October shows a preview, not active calling');}
    assert.ok(await panel.locator('.frog-listen-card').count()>=3,label+': listen-for cards in the forecast panel');

    // 1. Play wood frog.
    await page.locator('#frog-wood .frog-play').scrollIntoViewIfNeeded();
    await page.locator('#frog-wood .frog-play').click();
    await page.waitForFunction(()=>{const a=document.querySelector('audio.frog-audio-engine');return a&&!a.paused&&a.currentTime>0.3;},null,{timeout:15000});
    let s=await audioState(page);
    assert.match(s.src,/\/frog-media\/audio\/wood\.mp3$/);
    assert.equal(await pressed(page,'wood'),'true');
    assert.match(await page.locator('#frog-wood .frog-play').textContent(),/Pause/);
    assert.equal(await page.locator('#frog-wood .frog-replay').count(),1,label+': replay offered while playing');
    // 2. Play spring peeper: wood must stop, only one element ever plays.
    await page.locator('#frog-peeper .frog-play').scrollIntoViewIfNeeded();
    await page.locator('#frog-peeper .frog-play').click();
    await page.waitForFunction(()=>{const a=document.querySelector('audio.frog-audio-engine');return /peeper\.mp3$/.test(a.getAttribute('src'))&&!a.paused&&a.currentTime>0.3;},null,{timeout:15000});
    assert.equal(await pressed(page,'wood'),'false',label+': previous frog stopped');
    assert.equal(await pressed(page,'peeper'),'true');
    assert.equal(await page.locator('audio').count(),1,label+': a single shared audio element');
    // 3. Pause, then resume from where it was.
    await page.locator('#frog-peeper .frog-play').click();
    await page.waitForTimeout(300);
    s=await audioState(page);assert.equal(s.paused,true,label+': pause works');
    assert.match(await page.locator('#frog-peeper .frog-play').textContent(),/Resume/);
    // 4. Replay from the start.
    await page.locator('#frog-peeper .frog-replay').click();
    await page.waitForFunction(()=>{const a=document.querySelector('audio.frog-audio-engine');return !a.paused&&a.currentTime>0.1&&a.currentTime<4;},null,{timeout:15000});
    // 5. The forecast panel and the identification comparisons use the same player.
    const listenBtn=panel.locator('.frog-listen-card .frog-play').first();
    await listenBtn.scrollIntoViewIfNeeded();await listenBtn.click();
    await page.waitForFunction(()=>{const a=document.querySelector('audio.frog-audio-engine');return !/peeper\.mp3$/.test(a.getAttribute('src'))&&!a.paused;},null,{timeout:15000});
    assert.equal(await pressed(page,'peeper'),'false',label+': forecast-panel play stops the soundboard frog');
    const pair=page.locator('.frog-pair').nth(2);
    await pair.locator('.frog-play').nth(1).scrollIntoViewIfNeeded();await pair.locator('.frog-play').nth(1).click();
    await page.waitForFunction(()=>/bullfrog\.mp3$/.test(document.querySelector('audio.frog-audio-engine').getAttribute('src'))&&!document.querySelector('audio.frog-audio-engine').paused,null,{timeout:15000});
    // 6. Every recording referenced by the page is served.
    for(const id of ['wood','chorus','peeper','leopard','pickerel','toad','gray','copes','green','bullfrog','mink','fowlers','cricket']){
      const res=await page.request.get(BASE+'/frog-media/audio/'+id+'.mp3');
      assert.equal(res.status(),200,id+' audio served');assert.match(res.headers()['content-type']||'',/audio\/mpeg/);
    }
    // 7. Visible error handling when a recording cannot load.
    await page.route('**/frog-media/audio/mink.mp3',r=>r.fulfill({status:404,body:'missing'}));
    await page.locator('#frog-mink .frog-play').scrollIntoViewIfNeeded();
    await page.locator('#frog-mink .frog-play').click();
    await page.locator('#frog-mink .frog-play-error').waitFor({timeout:15000});
    assert.match(await page.locator('#frog-mink .frog-play-error').textContent(),/could not/i);
    await page.unroute('**/frog-media/audio/mink.mp3');
    // 8. Filters.
    await page.locator('.frog-filters button',{hasText:'Toads'}).click();
    assert.equal(await page.locator('.frog-species').count(),2,label+': Toads filter');
    await page.locator('.frog-filters button',{hasText:'Treefrogs'}).click();
    assert.equal(await page.locator('.frog-species').count(),3,label+': Treefrogs filter');
    await page.locator('.frog-filters button',{hasText:'All 13'}).click();
    // 9. Layout: no sideways scroll; photo and Play are the two biggest things on a card.
    const ov=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(ov<=1,label+': no horizontal scroll ('+ov+'px)');
    const card=await page.evaluate(()=>{const c=document.querySelector('#frog-green');const r=e=>c.querySelector(e).getBoundingClientRect();return {card:c.getBoundingClientRect().width,photo:r('.frog-photo').height,play:r('.frog-play').height};});
    assert.ok(card.photo>=card.card*0.7,label+': photo spans the card');assert.ok(card.play>=44,label+': Play is a full-size tap target');
    // 10. Forecast, map and region controls still render.
    assert.ok(await page.locator('#forecast').count()===1&&await page.locator('#map').count()===1);
    assert.ok(await page.locator('.frog-region-buttons button').count()===9,label+': nine regions');
    assert.ok(await page.locator('script[type="application/ld+json"]').count()>=1);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://phenology.chrisizworski.com/frog-chorus');
    assert.deepEqual(badMedia.filter(x=>!/mink\.mp3/.test(x)),[],label+': no broken media URLs');
    assert.deepEqual(errors,[],label+': no page errors');
    if(SHOTS){
      fs.mkdirSync(SHOTS,{recursive:true});
      await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(300);
      await page.screenshot({path:SHOTS+'/'+label+'-full.png',fullPage:true});
    }
    console.log('ok',label);
    await ctx.close();
  }
  await browser.close();
  console.log('Frog chorus browser test passed: photos, single-player playback, pause/replay, forecast listen cards, comparisons, errors, filters, layout.');
})().catch(e=>{console.error(e);process.exit(1);});
