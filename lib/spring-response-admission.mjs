// A response assembly timestamp is not an independent observation timestamp.
 // Reject expired delivery envelopes before allowing any regional decision to render.
export function currentEnvelope(packet,field,hours,now=Date.now()){
 const stamp=typeof packet?.[field]==="string"?Date.parse(packet[field]):NaN;
 return Number.isFinite(stamp)&&stamp<=now+60000&&now-stamp<=hours*3600000;
}
export function currentRegionalEnvelope(packet,regions,hours,field="generatedAt",now=Date.now()){
 if(!currentEnvelope(packet,field,hours,now)||!Array.isArray(packet.regions))return false;
 const ids=packet.regions.map(r=>r?.id),expected=new Set(regions.map(r=>r.id));
 return ids.length===expected.size&&new Set(ids).size===ids.length&&ids.every(id=>expected.has(id));
}
export function currentSingleRegion(packet,id,hours,now=Date.now()){
 return currentEnvelope(packet,"generatedAt",hours,now)&&packet.region?.id===id&&Array.isArray(packet.region.nights);
}
