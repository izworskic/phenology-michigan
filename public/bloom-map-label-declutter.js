(() => {
  'use strict';
  // Every marker stays on the map. Only overlapping permanent text is hidden.
  // This applies on tablets and desktop as well as phones, not just <=600px.
  const PAD = 6;
  let queued = false;
  const collides = (a,b) => a.left < b.right+PAD && a.right+PAD > b.left && a.top < b.bottom+PAD && a.bottom+PAD > b.top;
  function declutter(){
    queued=false;
    const nodes=[...document.querySelectorAll('.bloom-map-tooltip')];
    nodes.forEach(node => node.classList.remove('bloom-tooltip-collided'));
    const placed=[];
    for(const node of nodes){
      const rect=node.getBoundingClientRect();
      if(!rect.width || !rect.height) continue;
      if(placed.some(p=>collides(rect,p))) node.classList.add('bloom-tooltip-collided');
      else placed.push(rect);
    }
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(declutter)}
  function start(){
    new MutationObserver((records)=>{
      // Ignore class changes made by the declutter pass itself.
      if(records.some(r=>!r.target?.classList?.contains('bloom-map-tooltip'))) schedule();
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
    window.addEventListener('bloom-map-ready',schedule);
    window.addEventListener('resize',schedule,{passive:true});
    window.addEventListener('orientationchange',schedule,{passive:true});
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
