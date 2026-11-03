import {readHistoryIndex,readHistoryYear} from '../../lib/phenophase-history.mjs';

export default async function handler(req,res){
 if(req.method!=='GET'){
  res.setHeader('Allow','GET');
  return res.status(405).json({error:'GET only'});
 }
 const rawYear=req.query.year;
 const rawDay=req.query.date;
 if(Array.isArray(rawYear)||Array.isArray(rawDay)
    ||(rawDay!=null&&!/^\d{4}-\d{2}-\d{2}$/.test(rawDay))
    ||(rawYear!=null&&!/^[0-9]{4}$/.test(rawYear))){
  res.setHeader('Cache-Control','no-store');
  return res.status(400).json({error:'Use a four-digit year and optional ISO date'});
 }
 if(rawYear==null&&rawDay==null){
  const index=await readHistoryIndex();
  if(!index){
   res.setHeader('Cache-Control','no-store');
   return res.status(503).json({state:'unavailable',message:'Verified historical archive index unavailable'});
  }
  res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=600');
  return res.status(200).json(index);
 }
 const year=rawYear==null?Number(rawDay.slice(0,4)):Number(rawYear);
 if(year<2026||year>2200||(rawDay!=null&&Number(rawDay.slice(0,4))!==year)){
  return res.status(400).json({error:'Requested date and year must agree'});
 }
 const index=await readHistoryIndex();
 if(!index){
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({state:'unavailable',message:'Verified historical archive index unavailable'});
 }
 if(!index.years.some(y=>y.year===year)){
  res.setHeader('Cache-Control','no-store');
  return res.status(404).json({state:'not-collected',message:'No archived observation collection year exists. This does not mean no biological activity occurred.'});
 }
 const history=await readHistoryYear(year);
 if(!history){
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({state:'unavailable',message:'Verified yearly archive unavailable; no observations inferred.'});
 }
 if(rawDay!=null){
  // A remote index can know about days beyond the older bundled year file.
  // If fetching the newer annual file fails, do not call the absent day
  // 'not-collected' when the archive is in fact temporarily unavailable.
  const indexed=index.years.find(y=>y.year===year);
  if(indexed && (history.snapshots.length!==indexed.snapshotDays
                 || history.snapshots[0]?.asOfDate!==indexed.firstSnapshot
                 || history.snapshots.at(-1)?.asOfDate!==indexed.lastSnapshot)){
   res.setHeader('Cache-Control','no-store');
   return res.status(503).json({
    state:'unavailable',
    message:'Complete dated archive temporarily unavailable; collection gaps cannot be verified.'
   });
  }
  const item=history.snapshots.find(s=>s.asOfDate===rawDay);
  if(!item){
   res.setHeader('Cache-Control','public, s-maxage=300');
   return res.status(404).json({state:'not-collected',date:rawDay,message:'No snapshot was collected on that date, not a biological absence.'});
  }
  res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=600');
  return res.status(200).json(item);
 }
 res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=600');
 return res.status(200).json(history);
}
