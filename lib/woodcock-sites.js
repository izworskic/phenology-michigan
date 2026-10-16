// Evidence-backed Michigan woodcock walk venues. Reviewed 2026-10-16.
// An event at a venue does not prove woodcock are displaying there today,
// nor does it authorize independent entry past a park's posted closing time.
// Pins indicate event meeting points or approximate property centers, NEVER display clearings.
export const WOODCOCK_SITES = [
  {
    id:'lame-duck',name:'Lame Duck Foot Access Area GEMS',county:'Gladwin',region:'Near West Branch / Gladwin',kind:'Public state forest / GEMS',
    lat:44.098025,lon:-84.236925,pointType:'published-meeting',regionId:'saginaw-bay',
    evidence:'Michigan DNR and Ruffed Grouse Society hosted dusk woodcock walks in April 2025 and 2026.',
    eventDate:'2026-04-23',eventSource:'https://ruffedgrousesociety.org/events/north-central-michigan-chapter-woodcock-walk-2/',
    backupSource:'https://content.govdelivery.com/accounts/MIDNR/bulletins/3da3944',
    accessSource:'https://www.michigan.gov/dnr/things-to-do/hunting/where',accessType:'verify',
    where:'Bowmanville Road at Lame Duck Truck Trail. The GPS point is the DNR-published 2025 meetup, not a guaranteed place to see a bird.',
    parking:'The DNR specifically published this road intersection as the walk meeting point. Check the GEMS map and current parking signage before leaving your car.',
    directions:'44.098025,-84.236925',
    walk:'Trails may be muddy and uneven; DNR described the 2025 organized walk as not ADA-accessible.',
    accessWarning:'Public GEMS land; dusk entry, seasonal gates and parking restrictions have not been independently confirmed for self-guided visits.',
    mapSource:'https://www.dnr.state.mi.us/publications/pdfs/HuntingWildlifeHabitat/SGA/Lame_Duck_Area_GEMS_SWMA_map.pdf',
    verifiedOn:'2026-10-16',evidenceYear:2026
  },
  {
    id:'gourdneck',name:'Gourdneck State Game Area',county:'Kalamazoo',region:'Portage',kind:'Public state game area',
    lat:42.17949,lon:-85.63472,pointType:'approximate-property',regionId:'kalamazoo',
    evidence:'Portage and Michigan DNR held a Timberdoodle Dance guided walk April 24, 2026; Portage also documented an April 2025 walk.',
    eventDate:'2026-04-24',eventSource:'https://www.portagemi.gov/DocumentCenter/View/14370/ONLINE-2026-Spring-Summer-Rec-Guide-PDF',
    backupSource:'https://www.portagemi.gov/m/newsflash/Archive/Item/1513?arcId=2211',
    accessSource:'https://www.michigan.gov/dnr/about/newsroom/releases/2026/10/02/construction-project-nears-completion-at-gourdneck',accessType:'verify',
    where:'The 2026 walk named the second Angling Road parking lot. The map pin denotes the general game area—not that lot.',
    parking:'DNR reported Centre Avenue parking and temporary Hampton Lake Trail restrictions during fall 2026 construction; verify the current allowed access point and closures.',
    directions:'Gourdneck State Game Area Angling Road Portage MI',
    walk:'Mixed wetland and grassy terrain; wear waterproof footwear. Do not enter signed construction zones.',
    accessWarning:'2026 construction/parking notice remains a check-before-you-go issue. No claim of confirmed unrestricted after-dark entry.',
    mapSource:'https://www.michigan.gov/en/dnr/things-to-do/hunting/where/state-wildlife-game-areas-list',
    verifiedOn:'2026-10-16',evidenceYear:2026
  },
  {
    id:'luton',name:'Luton Park · Prairie Overlook',county:'Kent',region:'Rockford',kind:'Kent County park',
    lat:43.11364,lon:-85.51781,pointType:'approximate-property',regionId:'grand-rapids',
    evidence:'Ruffed Grouse Society held registered spring sky-dance walks April 8 and 15, 2026, from Prairie Overlook parking.',
    eventDate:'2026-04-15',eventSource:'https://ruffedgrousesociety.org/events/month/2026-04/',
    backupSource:'https://ruffedgrousesociety.org/wp-content/uploads/2026/03/235-GrandRapidsMIWoodcockWalk26.pdf',
    accessSource:'https://www.kentcountymi.gov/Facilities/Facility/Details/Luton-Park-20',accessType:'event-only',
    where:'Prairie Overlook entrance: 5871 Kies Street NE, Rockford. General park pin is NOT the Prairie Overlook lot.',
    parking:'Organized walk instructions identify the Prairie Overlook parking lot on the north side of Kies Street, 0.7 mile east of Courtland Drive.',
    directions:'5871 Kies Street NE Rockford MI 49341',
    walk:'Event organizers described viewing areas approximately 200 yards from the parking lot.',
    accessWarning:'Published park hours end at sunset. Do not treat this as an independent post-sunset destination; use an explicitly authorized guided event.',
    mapSource:'https://www.kentcountymi.gov/Facilities/Facility/Details/Luton-Park-20',
    verifiedOn:'2026-10-16',evidenceYear:2026
  },
  {
    id:'hailand',name:'Sally & Art Hailand Jr. Nature Preserve',county:'Emmet',region:'Harbor Springs',kind:'Little Traverse Conservancy preserve',
    lat:45.4193,lon:-84.869,pointType:'approximate-property',regionId:'gaylord',
    evidence:'Little Traverse Conservancy led woodcock sky-dance walks on April 8 and April 11, 2026.',
    eventDate:'2026-04-11',eventSource:'https://landtrust.org/events-template/weekend-woodcock-walk/',
    backupSource:'https://www.interlochenpublicradio.org/community-calendar/event/weekday-woodcock-walk-24-03-2026-12-28-07',
    accessSource:'https://landtrust.org/explore/hailand-helstrom-nature-preserve/',accessType:'verify',
    where:'4855 West Conway Road, Harbor Springs; meet at the designated preserve parking area for an organized event.',
    parking:'Conservancy directions describe a signed parking area on the north side of West Conway Road, about 0.2 mile west of US-31.',
    directions:'4855 West Conway Road Harbor Springs MI 49740',
    walk:'Roughly 1.5 miles of trails through the paired preserves; event route and access may be shorter.',
    accessWarning:'Preserve is open for public trail visits, but after-dark self-guided access is not confirmed. Check conservancy policies.',
    mapSource:'https://landtrust.org/explore/hailand-helstrom-nature-preserve/',
    verifiedOn:'2026-10-16',evidenceYear:2026
  },
  {
    id:'dahlem',name:'Dahlem Environmental Education Center',county:'Jackson',region:'Jackson',kind:'Education center / preserve',
    lat:42.16311,lon:-84.42679,pointType:'parking-area',regionId:'lansing',
    evidence:'Dahlem hosted a sold-out American Woodcock Program & Night Walk on April 9, 2026.',
    eventDate:'2026-04-09',eventSource:'https://www.dahlemcenter.org/events/category/event-festival/list/?eventDisplay=past',
    backupSource:'https://www.jacksonaudubon.org/events',
    accessSource:'https://www.dahlemcenter.org/',accessType:'event-only',
    where:'7117 S. Jackson Road, Jackson. The marker points to a mapped parking area, not the display field.',
    parking:'Use center-designated parking when attending an authorized program.',
    directions:'7117 S Jackson Road Jackson MI 49201',
    walk:'The 2026 program included a guided night walk into the grasslands.',
    accessWarning:'2026 organized event was sold out. Do not assume the grounds are available for independently entering after posted hours.',
    mapSource:'https://www.dahlemcenter.org/',
    verifiedOn:'2026-10-16',evidenceYear:2026
  },
  {
    id:'belle-isle',name:'Belle Isle Nature Center',county:'Wayne',region:'Detroit',kind:'State park nature center',
    lat:42.347546,lon:-82.963765,pointType:'published-venue',regionId:'detroit',
    evidence:'Michigan DNR listed a Nature at Night: Evening Woodcock Walk for April 23, 2026.',
    eventDate:'2026-04-23',eventSource:'https://content.govdelivery.com/accounts/MIDNR/bulletins/40fe45f',
    backupSource:'https://belleislenaturecenter.org/visit/',
    accessSource:'https://belleislenaturecenter.org/visit/',accessType:'event-only',
    where:'Belle Isle Nature Center, 176 Lakeside Drive, Detroit. The pin is the center location, NOT the courtship field.',
    parking:'Recreation Passport required for vehicles entering Belle Isle; only attend scheduled evening programs under authorized access.',
    directions:'176 Lakeside Drive Detroit MI 48207',
    walk:'Evening program itinerary varies; verify specifics with the nature center.',
    accessWarning:'The nature center normally closes at 5 p.m. Evening events are special programming, not permission for unscheduled night access.',
    mapSource:'https://belleislenaturecenter.org/visit/',
    verifiedOn:'2026-10-16',evidenceYear:2026
  }
];
export const ACCESS_LABELS={verify:'Public destination · dusk access unverified','event-only':'Organized evening only unless confirmed'};
export const PIN_LABELS={'published-meeting':'DNR-published historical meetup','published-venue':'Organizer-published building location','parking-area':'Mapped parking area','approximate-property':'Approximate property location'};
export function viewingSitesForRegion(regionId,limit) {
  const chosen=(WOODCOCK_SITES.some(s=>s.regionId===regionId)?regionId:'saginaw-bay');
  const rank=(s)=>s.regionId===chosen?0:1;
  const ordered=[...WOODCOCK_SITES].sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
  return Number.isInteger(limit)?ordered.slice(0,Math.max(0,limit)):ordered;
}
export function distanceMiles(a,b) {
  const rad=n=>n*Math.PI/180;
  if(!a||!b||![a.lat,a.lon,b.lat,b.lon].every(Number.isFinite))return null;
  const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon),h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return Math.round(3958.8*2*Math.asin(Math.min(1,Math.sqrt(h))));
}
// A dated organized walk supports a historical display lead, never contemporary occupancy.
// There are deliberately NO 'open after dark' assertions in this registry.
export function siteCanBeCalledOpenAfterDark(site){return false;}
