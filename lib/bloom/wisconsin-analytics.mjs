// Privacy-limited Wisconsin funnel. Reuse the existing site's GA4 stream.
const ID='G-Y5D2V2W7HN';
const EVENTS=new Set(['wi_map_select','wi_filter','wi_official_source','wi_directions','wi_guide_open','wi_state_handoff','wi_page_view','wi_source_refresh','wi_faq_open','wi_map_jump','wi_timeline_jump']);
function symbolic(value, fallback='none') {
  const text=String(value??fallback);
  return /^[a-z0-9][a-z0-9_-]{0,49}$/.test(text)?text:fallback;
}
function init(){
  if(typeof window==='undefined')return false;
  if(window.__wiAnalyticsReady)return true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
  window.gtag('js',new Date());
  window.gtag('config',ID,{send_page_view:false});
  window.__wiAnalyticsReady=true;
  return true;
}
export function trackWisconsinEvent(action,detail={}){
  if(!EVENTS.has(action)||!init())return false;
  const payload={
    tool_id:'wisconsin-bloom-tracker',
    destination_id:symbolic(detail.destination_id),
    selection:symbolic(detail.selection),
    surface:symbolic(detail.surface),
    state:'wisconsin'
  };
  if(action==='wi_page_view'){
    const path=String(detail.page_path||'/wisconsin-bloom-tracker');
    payload.page_path=path.startsWith('/wisconsin-bloom-tracker')&&!/[?#]/.test(path)?path:'/wisconsin-bloom-tracker';
    // Standard GA4 page_view powers Pages & Screens, Landing Page, and engagement reports.
    // Route event is explicit because config disables automatic page_view to avoid duplicates.
    window.gtag('event','page_view',{
      page_location:'https://phenology.chrisizworski.com'+payload.page_path,
      page_path:payload.page_path,
      tool_id:payload.tool_id
    });
  }
  window.gtag('event',action,payload);
  return true;
}
export function trackWisconsinClick(event,fallback='none'){
  const target=event?.target;
  if(!target||typeof target.closest!=='function')return;
  const el=target.closest('[data-wi-action]');
  if(!el)return;
  const action=el.getAttribute('data-wi-action');
  if(EVENTS.has(action))trackWisconsinEvent(action,{
    destination_id:el.getAttribute('data-wi-destination')||fallback,
    selection:el.getAttribute('data-wi-selection')||'none',
    surface:el.getAttribute('data-wi-surface')||'content'
  });
}
