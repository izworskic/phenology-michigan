/**
 * The First Freeze: pure, repeatable evidence adapter for Saginaw Bay.
 * Experience Foundry pilot 01. Existing sources only; no new API, routing or models.
 * Inputs are the owning phenology page's banked NOAA signal, Bay City forecast,
 * and Bay County eBird notable reports. Source categories must never be merged.
 */
export const FIRST_FREEZE_CHAPTERS = Object.freeze([
  {
    id: "late-autumn", name: "Late autumn", window: "October–November",
    heading: "The marsh fills, the light grows thin",
    story: "Migrating waterfowl may gather in sheltered wetlands before the hard water season. A documented observation means someone reported a bird, not that it remains at a particular overlook.",
    lookFor: "Waterfowl and raptors in managed wetlands; watch for changing flock composition rather than presumed peak dates.",
    question: "What birds have actually been reported, and how recently?"
  },
  {
    id: "first-freeze", name: "First freeze", window: "November–December",
    heading: "The edge of the water changes",
    story: "Early freezing weather can transform sheltered marshes before open-water portions of the bay. A single offshore NOAA grid reading cannot tell you whether a boardwalk, shore, or channel is icy.",
    lookFor: "Open-water pockets, changing shoreline textures and bird movement, without assuming water or ice is safe to enter.",
    question: "What is measured offshore, and what is only forecast on land?"
  },
  {
    id: "deep-winter", name: "Deep winter", window: "December–February",
    heading: "Wildlife follows the remaining water",
    story: "Winter bird activity changes with weather, habitat and disturbance. Dated reports can suggest what to watch for, but neither ice coverage nor an air forecast confirms an eagle or duck sighting.",
    lookFor: "Waterfowl and eagles from legal public approaches; give birds space and never approach ice.",
    question: "What conditions are documented, and which places permit public viewing?"
  },
  {
    id: "spring-return", name: "Spring return", window: "March–April",
    heading: "The wetlands open again",
    story: "Open water, lengthening days and spring migration overlap, but one date does not describe the entire bay. Separately inspect observed ice conditions, weather and independently dated reports.",
    lookFor: "First documented arrivals, changing wetland habitat and differences between sheltered and exposed shorelines.",
    question: "Which reports mark an observed event rather than a usual calendar window?"
  }
]);

export const FIRST_FREEZE_SITES = Object.freeze([
  {
    id: "bay-city", name: "Bay City State Park & Tobico Marsh",
    region: "West shore / Bay City", authority: "Michigan DNR",
    link: "https://www.michigan.gov/recsearch/parks/baycity",
    habitat: "Coastal wetlands, boardwalks, observation structures and shoreline",
    reason: "The DNR identifies the Tobico Marsh as important for migrating birds and describes viewing towers and boardwalks.",
    fieldAction: "Explore the published park trails and observation areas; confirm any park or construction alerts with the DNR before departing.",
    caution: "A park listing is not today's trail or tower inspection. The campground has separate construction restrictions."
  },
  {
    id: "nayanquing", name: "Nayanquing Point viewing platform",
    region: "West shore / north of Linwood", authority: "Michigan DNR",
    link: "https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/nayanquing-point-swa",
    habitat: "Managed migration wetlands and the Kitchen Road observation platform",
    reason: "The DNR specifically identifies the platform at the end of Kitchen Road as a migration-watching place.",
    fieldAction: "Review the DNR wildlife-area map, hunting schedule and viewing-platform guidance; remain on authorized public approaches.",
    caution: "The manager's office address is not the Kitchen Road platform. Waterfowl and deer hunts can affect visitor movement."
  },
  {
    id: "fish-point", name: "Fish Point State Wildlife Area",
    region: "East shore / Unionville", authority: "Michigan DNR",
    link: "https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/fish-point-swa",
    habitat: "Managed waterfowl habitat, marshes and open farmland",
    reason: "The DNR documents migrating birds, wildlife viewing and waterfowl-management activity here.",
    fieldAction: "Consult the DNR map, hunting-zone rules and manager updates before entering; never assume a hunting unit is a visitor trail.",
    caution: "The area conducts daily waterfowl permit drawings during season. No unit-level visitor access is inferred."
  },
  {
    id: "ferguson", name: "Ferguson Bayou Trail",
    region: "Shiawassee wetlands / Saginaw", authority: "U.S. Fish & Wildlife Service",
    link: "https://www.fws.gov/refuge/shiawassee/visit-us/trails",
    closureLink: "https://www.fws.gov/locations/shiawassee-national-wildlife-refuge",
    habitat: "Dike-top wetland trail with observation decks and a photo blind",
    reason: "The refuge describes a public trail overlooking wetlands and pools, subject to seasonal hunting and flood restrictions.",
    fieldAction: "Check the refuge's dated hunt-closure notices and trail conditions before traveling; the Wildlife Drive has a separate seasonal schedule.",
    caution: "The Wildlife Drive is not interchangeable with the Ferguson Bayou walking trail. Wildlife Drive winter closure does not by itself mean the trail is open.",
    known2026Closures: [["2026-09-12","2026-09-13"],["2026-10-01","2026-10-07"],["2026-10-15","2026-10-18"],["2026-10-30","2026-11-05"],["2026-11-15","2026-11-29"],["2026-12-04","2026-12-06"],["2026-12-17","2026-12-23"]]
  }
]);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const asDay = value => {
  if (typeof value !== "string") return null;
  const s = value.slice(0, 10);
  if (!ISO_DAY.test(s)) return null;
  const d = new Date(s + "T12:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === s ? s : null;
};
const dayDiff = (today, earlier) => (Date.parse(today + "T12:00:00Z") - Date.parse(earlier + "T12:00:00Z")) / 86400000;
export function detroitDay(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone:"America/Detroit",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(d).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
  return p.year+"-"+p.month+"-"+p.day;
}
export function firstFreezeChapterForDate(day) {
  const month = Number((asDay(day)||"2000-11-01").slice(5,7));
  if (month===12) return "first-freeze";
  if (month===1 || month===2) return "deep-winter";
  if (month===3 || month===4) return "spring-return";
  return "late-autumn"; // A calendar orientation, never a claim about conditions.
}
export function firstFreezeSiteAccess(site, day) {
  const date = asDay(day);
  if (!site || !date) return {kind:"verify",label:"Check land manager"};
  if (site.id==="ferguson" && date.startsWith("2026-") &&
    site.known2026Closures.some(([start,end])=>date>=start && date<=end)) {
    return {kind:"listed-closure", label:"FWS lists this trail CLOSED on this 2026 date",
      explanation:"The agency's 2026 deer-hunt notice closes Ferguson Bayou Trail to public use during this interval. Confirm any subsequent notice with the refuge."};
  }
  return {kind:"verify", label:"Access not verified for today",
    explanation:"This is a documented public viewing destination, not an open-now report. Check the linked land-manager rules, hunting notices and current conditions."};
}
function pointEvidence(value, date, today, min, max, unit, sourceLabel, scope, bankAge) {
  const day=asDay(date);
  const age=day?dayDiff(today,day):Infinity;
  const valid = typeof value==="number" && Number.isFinite(value) && value>=min && value<=max;
  const available=valid && Number.isFinite(age) && age>=0;
  if (!available) return {kind:"unavailable",text:"No valid dated reading",date:null,detail:scope,source:sourceLabel};
  const fresh=age<=3 && Number.isFinite(bankAge) && bankAge>=0 && bankAge<=2;
  return {kind:fresh?"recent-reference":"historical",text:String(Math.round(value*10)/10)+unit,date:day,
    detail:scope+(fresh?" Dated reference reading; not a direct observation of any visitor site.":" Older/reference-only reading; no current condition is claimed."),
    source:sourceLabel};
}
const bayIceScope="One NOAA GLERL modeled or analyzed offshore grid cell near 43.9°N, 83.4°W, not a baywide ice percentage or safe-ice assessment.";
const lakeTempScope="NOAA GLSEA offshore surface grid reference, not a water temperature at the selected marsh or trail.";
export function buildFirstFreezeEvidence({now=new Date(),bay={},forecast={},birds=[],signalGeneratedAt=null}={}) {
  const day=detroitDay(now);
  const bundleDate=asDay(signalGeneratedAt);
  const bankAge=bundleDate?dayDiff(day,bundleDate):Infinity;
  const ice=pointEvidence(bay?.iceConc,bay?.iceDate,day,0,100,"%", "NOAA GLERL offshore ice grid",bayIceScope,bankAge);
  const surface=pointEvidence(bay?.glseaF,bay?.glseaDate,day,-5,110,"°F","NOAA GLSEA surface grid",lakeTempScope,bankAge);
  const validLows=(Array.isArray(forecast?.lows)?forecast.lows:[]).filter(n=>typeof n==="number" && Number.isFinite(n) && n>=-70 && n<=130);
  const low=validLows.length?Math.min(...validLows):null;
  const coldOutlook=low==null?{kind:"unavailable",text:"No valid forecast lows",detail:"Weather availability cannot be inferred from ice or bird records."}:
   {kind:"forecast",text:Math.round(low)+"°F",detail:"Lowest modeled daily minimum in the next seven forecast days for Bay City, not measured air temperature or marsh ice."};
  const recentBirds = (Array.isArray(birds)?birds:[])
    .filter(r=>typeof r?.comName==="string" && r.comName.trim() && asDay(r.obsDt))
    .map(r=>({...r,day:asDay(r.obsDt)}))
    .filter(r=>{const age=dayDiff(day,r.day);return age>=0 && age<=10;})
    .sort((a,b)=>b.day.localeCompare(a.day))
    .slice(0,5).map(r=>({
      name:r.comName.slice(0,100),date:r.day,location:typeof r.locName==="string"?r.locName.slice(0,100):"",
      reviewed:r.obsReviewed===true
    }));
  const month=Number(day.slice(5,7));
  return {
    asOf:day,chapterId:firstFreezeChapterForDate(day),inSeason:(month>=10||month<=4),
    ice,surface,coldOutlook,birds:recentBirds,
    birdsKind:recentBirds.length?"recent-county-notable":"unavailable",
    birdsScope:"eBird notable checklist reports in Bay County (past ten days), not reports at the selected viewpoint, not a census, and not independently verified here.",
    sourceLinks:{
      ice:"https://apps.glerl.noaa.gov/erddap/index.html",
      surface:"https://coastwatch.glerl.noaa.gov/",
      forecast:"https://open-meteo.com/en/docs",
      birds:"https://ebird.org/region/US-MI-017/recent"
    }
  };
}
