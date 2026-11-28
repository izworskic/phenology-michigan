// Open-Meteo daily dates are civil dates at the requested Michigan location,
// not instants at UTC midnight. Format the calendar day independently of
// the browser/server timezone to preserve both SSR hydration and its meaning.
export function civilDateLabel(value,options={}){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return "date unavailable";
 const d=new Date(value+"T12:00:00Z");
 if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==value)return "date unavailable";
 return d.toLocaleDateString("en-US",{...options,timeZone:"UTC"});
}
export function michiganCivilDay(value){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value).filter(p=>p.type!=="literal").map(p=>[p.type,Number(p.value)]));
 return (Date.UTC(parts.year,parts.month-1,parts.day)-Date.UTC(parts.year,0,0))/86400000;
}
