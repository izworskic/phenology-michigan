(() => {
  'use strict';
  // Google's documented per-link interstitial opt-out; do not reposition
  // Google-managed ad frames or alter ad creative. Anchor-ad volume is an
  // account-level Auto Ads setting, not controllable here.
  const apply=(root)=>{
    if(root.nodeType!==1)return;
    if(root.matches?.('a[href]'))root.setAttribute('data-google-vignette','false');
    root.querySelectorAll?.('a[href]').forEach(a=>a.setAttribute('data-google-vignette','false'));
  };
  const run=()=>{
    apply(document.body);
    new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(apply)))
      .observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
