import {useState} from 'react';
import {wisconsinPhotoFor} from '../lib/bloom/wisconsin-visuals.mjs';

/** File photograph and complete reuse credit. Never described as a live image. */
export default function WisconsinPhoto({id,variant='card',priority=false}){
  const [failed,setFailed]=useState(false);
  const photo=wisconsinPhotoFor(id);
  if(!photo||failed)return null;
  return <figure className={'wi-photo wi-photo-'+variant}>
    <div className="wi-photo-frame">
      <img src={photo.imageUrl} alt={photo.alt} loading={priority?'eager':'lazy'} decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)} />
      <span className="wi-photo-not-live">Reference photo · not live</span>
    </div>
    <figcaption><span>{photo.location} · {photo.date}</span><a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.creator} · {photo.license}</a></figcaption>
  </figure>;
}
