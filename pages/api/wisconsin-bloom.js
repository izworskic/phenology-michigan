import WISCONSIN from '../../data/wisconsin-bloom.json';
const WINDOW=5*86400000;
export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 const now=Date.now();
 const observations=(WISCONSIN.fieldNotes||[]).filter(note=>{
  const stop=WISCONSIN.destinations.find(d=>d.id===note.destinationId);
  if(!stop||!note.observedAt||!note.stage||!note.sourceUrl||!note.sourceName)return false;
  if(!['BUDDING','BUILDING','NEAR_PEAK','PEAK','FADING','DONE'].includes(note.stage))return false;
  if(![stop.sourceUrl,...(stop.links||[]).map(link=>link[1])].includes(note.sourceUrl))return false;
  const age=now-Date.parse(note.observedAt);
  return Number.isFinite(age)&&age>=0&&age<=WINDOW;
 });
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
 return res.status(200).json({state:'verified-notes-only',lastReviewed:WISCONSIN.updated,observations,explanation:observations.length?'Only source-validated, dated reports are returned.':'No current dated observations are on file. Typical seasonal timing is not live bloom data.'});
}
