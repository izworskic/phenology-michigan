import {useMemo,useState} from 'react';
import {ArrowUpRight,CalendarDays,Compass,MapPin,ShieldAlert,ParkingCircle,Footprints,Info,CheckCircle2} from 'lucide-react';
import {WOODCOCK_SITES,ACCESS_LABELS,PIN_LABELS,distanceMiles} from '../lib/woodcock-sites';
import {REGIONS} from '../lib/woodcock';

const safeDirections=query=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query);
const dateText=d=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
function AccessTag({code}) {
  return <span className={'woodcock-access-tag '+code}>{ACCESS_LABELS[code]}</span>;
}
export default function WoodcockViewingFinder({regionId,selectedSite,onPickSite}) {
  const [filter,setFilter]=useState('all');
  const ref=REGIONS.find(r=>r.id===regionId)||REGIONS[4];
  const sorted=useMemo(()=>[...WOODCOCK_SITES].sort((a,b)=>{
    const aDistance=distanceMiles(ref,a),bDistance=distanceMiles(ref,b);
    return aDistance-bDistance||a.name.localeCompare(b.name);
  }),[ref]);
  const visible=sorted.filter(s=>filter==='all'||s.accessType===filter);
  const active=visible.find(s=>s.id===selectedSite)||visible[0]||null;
  return <div className="woodcock-access-atlas" id="woodcock-access-atlas">
    <div className="woodcock-access-head">
      <div><span className="woodcock-eyebrow">DOCUMENTED SPRING WALKS · RESEARCHED ACCESS</span><h3>Where can you actually watch?</h3></div>
      <span className="woodcock-review-date"><CheckCircle2 size={14}/> Sources checked October 16, 2026</span>
    </div>
    <p className="woodcock-access-lead">Six Michigan places with documented woodcock walks. Choose a site to see historical evidence, the actual published meetup or entrance, and what still needs confirmation. <strong>None are certified as independently open after sunset.</strong></p>
    <div className="woodcock-access-key">
      <div><span className="woodcock-access-dot"/> Verified event history <small>Not a current bird sighting</small></div>
      <div><ShieldAlert size={17}/> After-dark access check <small>Mandatory before self-guided visiting</small></div>
      <div><MapPin size={17}/> Mapped location <small>Usually the property, not the display site</small></div>
    </div>
    <div className="woodcock-access-toolbar">
      <div className="woodcock-access-filter" role="group" aria-label="Filter by access status">
        <button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>All {WOODCOCK_SITES.length}</button>
        <button type="button" aria-pressed={filter==='verify'} onClick={()=>setFilter('verify')}>Public land / check access</button>
        <button type="button" aria-pressed={filter==='event-only'} onClick={()=>setFilter('event-only')}>Organized walks</button>
      </div>
      <span><Compass size={15}/> Sorted by approximate straight-line distance from {ref.name}; not driving miles.</span>
    </div>
    <div className="woodcock-access-layout">
      <div className="woodcock-access-list">
        {visible.map((s,i)=>{
          const activeRow=active?.id===s.id;
          return <button className={'woodcock-access-choice '+(activeRow?'active':'')} type="button" key={s.id} aria-pressed={activeRow} onClick={()=>onPickSite(s.id)}>
            <span className="woodcock-access-number">{String(i+1).padStart(2,'0')}</span>
            <span className="woodcock-access-choice-body"><strong>{s.name}</strong><small>{s.region} · {s.county} County</small><em>{s.accessType==='event-only'?'Past guided program · hours restriction':'Documented DNR / conservancy walk'}</em></span>
            <span className="woodcock-access-distance">~{distanceMiles(ref,s)} mi<span>direct</span></span>
          </button>;
        })}
      </div>
      <div className="woodcock-access-detail" aria-live="polite">
        {active&&<>
          <div className="woodcock-access-detail-heading">
            <div><span className="woodcock-access-dossier">LOCATION DOSSIER · {active.county.toUpperCase()}</span><h4>{active.name}</h4><p>{active.kind} · {active.region}</p></div>
            <AccessTag code={active.accessType}/>
          </div>
          <div className="woodcock-access-evidence"><CalendarDays size={19}/><div><strong>Documented woodcock walk · {dateText(active.eventDate)}</strong><p>{active.evidence} This is historical event evidence, not a verified 2027 walk or current observation.</p><a href={active.eventSource} target="_blank" rel="noopener noreferrer">Read the original event source <ArrowUpRight size={13}/></a></div></div>
          <div className="woodcock-access-details-grid">
            <div><span><MapPin size={15}/> Published approach</span><p>{active.where}</p></div>
            <div><span><ParkingCircle size={15}/> Parking and directions</span><p>{active.parking}</p></div>
            <div><span><Footprints size={15}/> On-the-ground conditions</span><p>{active.walk}</p></div>
            <div className="woodcock-access-warning"><span><ShieldAlert size={15}/> Access gate · confirm first</span><p>{active.accessWarning}</p></div>
          </div>
          <p className="woodcock-point-disclosure"><Info size={15}/> Pin meaning: {PIN_LABELS[active.pointType]}. No route across sensitive nesting or display habitat is inferred.</p>
          <div className="woodcock-access-links">
            <a className="primary" href={safeDirections(active.directions)} target="_blank" rel="noopener noreferrer"><MapPin size={17}/> Open address / meetup in maps <ArrowUpRight size={16}/></a>
            <a href={active.accessSource} target="_blank" rel="noopener noreferrer">Verify current access & hours <ArrowUpRight size={15}/></a>
            <a href={active.mapSource} target="_blank" rel="noopener noreferrer">Area / trail map <ArrowUpRight size={15}/></a>
          </div>
        </>}
      </div>
    </div>
    <div className="woodcock-access-fineprint"><ShieldAlert size={18}/><p><strong>Do not assume event permission carries over.</strong> Even a public game area may have posted parking restrictions or a special closure. County parks and nature centers often require an organized walk for after-hours entry. Check agency maps, regulations, current construction notices, and permitted vehicle access before planning a dusk trip. No after-dark access or live display has been independently confirmed for these sites.</p></div>
  </div>;
}
