// First Freeze: real-browser proof of the distinct experience, not a markup-only claim.
// Usage: BASE=http://localhost:3000 NODE_PATH=<isolated playwright-core> CHROME_BIN=/usr/bin/google-chrome SHOTS=<dir> node scripts/first-freeze-browser.cjs
const {chromium}=require("playwright-core");
const fs=require("node:fs");
const assert=require("node:assert/strict");
const path=require("node:path");
const BASE=(process.env.BASE||"http://localhost:3000").replace(/\/$/,"");
const CHROME=process.env.CHROME_BIN||"/usr/bin/google-chrome";
const SHOTS=process.env.SHOTS||"";

async function verify(browser,width,height){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:"reduce"});
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route(/googlesyndication|googletagmanager|doubleclick/,route=>route.abort());
  const r=await page.goto(BASE+"/",{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(r.status(),200,"phenology homepage served at "+width);
  assert.equal(await page.locator(".ff-invite").count(),1,"one compact invitation on homepage");
  assert.equal(await page.locator(".ff").count(),0,"full experience is not stacked on the homepage");
  assert.equal(await page.locator(".ny-dispatch").count(),1,"phenology field desk is preserved");
  assert.equal(await page.locator('link[rel=canonical]').getAttribute("href"),"https://phenology.chrisizworski.com/");
  const invite=page.locator("#first-freeze");
  assert.ok(await invite.evaluate(el=>el.getBoundingClientRect().height)<=180,width+": invitation stays compact");
  assert.equal(await invite.locator("a").getAttribute("href"),"/?experience=first-freeze#first-freeze");
  await invite.locator("a").click();
  await page.waitForURL(/experience=first-freeze/);
  const root=page.locator("#first-freeze");
  await root.waitFor({state:"visible",timeout:20000});
  assert.equal(await root.count(),1,"one immersive journey in focused view");
  assert.equal(await page.locator(".ff-invite").count(),0,"invitation is absent from focused view");
  assert.equal(await page.locator(".ny-dispatch").count(),0,"no phenology timeline stacked on journey");
  assert.equal(await page.locator('meta[name=robots]').getAttribute("content"),"noindex,follow");
  assert.equal(await page.locator('link[rel=canonical]').getAttribute("href"),"https://phenology.chrisizworski.com/");
  assert.equal(await page.locator(".ff-focus-return a").getAttribute("href"),"/");
  assert.match(await root.locator("h2").first().textContent(),/The First Freeze/);
  assert.equal(await root.locator(".ff-chapter").count(),4);
  assert.equal(await root.locator("#ff-place option").count(),4);
  assert.equal(await root.locator(".ff-signal").count(),3);
  assert.equal(await root.locator(".ff-signal a").count(),3);
  assert.equal(await root.locator(".ff-chapter[aria-pressed=true]").count(),1);

  const style=await root.evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.notEqual(style,"rgba(0, 0, 0, 0)",width+": themed CSS loaded");
  const bounds=await root.evaluate(el=>({width:el.getBoundingClientRect().width,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
  assert.ok(bounds.left>=-12&&bounds.right<=width+12,width+": pilot within phone viewport "+JSON.stringify(bounds));
  assert.ok(bounds.scrollWidth<=bounds.clientWidth+2,width+": no horizontal overflow inside pilot "+JSON.stringify(bounds));

  const evidenceBefore=await root.locator(".ff-facts").textContent();
  const firstFreezeButton=root.locator(".ff-chapter").nth(1);
  await firstFreezeButton.focus();
  await page.keyboard.press("Enter");
  assert.equal(await firstFreezeButton.getAttribute("aria-pressed"),"true",width+": keyboard selects first freeze");
  assert.match(await root.locator(".ff-focus-text h3").textContent(),/edge of the water changes/);
  assert.equal(await root.locator(".ff-facts").textContent(),evidenceBefore,width+": chapter must not mutate measured conditions");
  await root.locator(".ff-chapter").nth(2).click();
  assert.match(await root.locator(".ff-focus-text h3").textContent(),/Wildlife follows/);
  await firstFreezeButton.click();
  assert.match(await root.locator(".ff-focus-text h3").textContent(),/edge of the water changes/,width+": A→B→A reversible");

  await root.locator("#ff-place").selectOption("nayanquing");
  assert.match(await root.locator(".ff-place-story").textContent(),/Kitchen Road/);
  assert.equal(await root.locator(".ff-place-body h3").textContent(),"Nayanquing Point viewing platform");
  assert.equal(await root.locator(".ff-access a").first().getAttribute("href"),"https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/nayanquing-point-swa");
  await root.locator("#ff-place").selectOption("ferguson");
  const access=await root.locator(".ff-access").textContent();
  assert.match(access,/FWS lists this trail CLOSED|Access not verified for today/);
  assert.doesNotMatch(access, /\bopen now\b|\bsafe to visit\b/i);
  assert.equal(await root.locator(".ff-facts").textContent(),evidenceBefore,width+": site choice must not alter NOAA/NWS evidence");
  await root.locator("#ff-place").selectOption("bay-city");
  assert.match(await root.locator(".ff-place-body h3").textContent(),/Bay City State Park/);
  assert.equal(await root.locator(".ff-access-listed-closure").count(),0,width+": no inherited Ferguson warning");

  await root.locator(".ff-offline summary").click();
  assert.equal(await root.locator(".ff-offline h4").count(),4);
  assert.equal(await root.locator(".ff-offline li a").count(),4);
  const ext=await root.locator('a[href^="https://"]').count();
  assert.ok(ext>=8,width+": official evidence and specialist links remain usable");
  if(SHOTS){
    fs.mkdirSync(SHOTS,{recursive:true});
    await root.screenshot({path:path.join(SHOTS,"first-freeze-"+width+".png"),animations:"disabled"});
  }
  if(errors.length)console.log(width+" existing-page runtime errors (inspect before release): "+errors.slice(0,5).join("; "));
  await ctx.close();
}
(async()=>{
 const browser=await chromium.launch({executablePath:CHROME,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
   for(const [w,h] of [[360,780],[390,844],[768,1024],[1440,900]])await verify(browser,w,h);
   const ctx=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
   const page=await ctx.newPage();
   await page.route(/googlesyndication|googletagmanager|doubleclick/,route=>route.abort());
   const response=await page.goto(BASE+"/",{waitUntil:"domcontentloaded",timeout:45000});
   assert.equal(await page.locator(".ff-invite").count(),1,"no-JS phenology invitation visible");
   assert.equal(await page.locator(".ff").count(),0,"no-JS homepage contains no full journey");
   const focused=await page.goto(BASE+"/?experience=first-freeze",{waitUntil:"domcontentloaded",timeout:45000});
   assert.equal(response.status(),200,"no-JS HTML served");
   assert.equal(focused.status(),200);
   assert.equal(await page.locator("#first-freeze").count(),1);
   assert.equal(await page.locator(".ny-dispatch").count(),0);
   assert.equal(await page.locator("#first-freeze .ff-offline h4").count(),4,"no-JS chapter text rendered on server");
   assert.equal(await page.locator("#first-freeze .ff-offline li a").count(),4,"no-JS agency links remain visible in source");
   await ctx.close();
   console.log("First Freeze focus QA passed: uncluttered homepage, immersive focus, 4 viewports, keyboard, source scope and no-JS.");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
