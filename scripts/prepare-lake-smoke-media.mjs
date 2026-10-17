/* Build-time, rights-attributed copy of a genuine Lake Michigan steam-fog photo.
 * Source: Edward Stojakovic, "Steaming Lake Michigan", 6 January 2014,
 * https://commons.wikimedia.org/wiki/File:Steaming_Lake_Michigan_(11809462446).jpg
 * License: CC BY 2.0 https://creativecommons.org/licenses/by/2.0/
 * The image is displayed with responsive cropping; attribution is visible.
 * This downloads the licensed JPEG into public/ BEFORE Next's build.
 * If Wikimedia is temporarily unavailable, site still builds; the React image
 * falls back to the remote Commons thumbnail with a visible source credit.
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const URL='https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Steaming_Lake_Michigan_%2811809462446%29.jpg/1280px-Steaming_Lake_Michigan_%2811809462446%29.jpg';
const dest=new URL('../public/lake-smoke/lake-smoke-hero.jpg',import.meta.url);
const valid=bytes=>bytes?.length>8000&&bytes.length<2200000&&bytes[0]===0xff&&bytes[1]===0xd8;
try{
  const existing=await readFile(dest);
  if(valid(existing)){console.log('Existing licensed lake smoke photograph verified');process.exit(0);}
}catch{}
try{
  const response=await fetch(URL,{
    signal:AbortSignal.timeout(12500),
    headers:{Accept:'image/jpeg','User-Agent':'Michigan-Phenology-Lake-Smoke/1.0 (https://phenology.chrisizworski.com/lake-smoke; licensed CC-BY educational photograph)'}
  });
  if(!response.ok)throw Error('image source HTTP '+response.status);
  if(!response.headers.get('content-type')?.toLowerCase().includes('image/jpeg'))throw Error('unexpected image type');
  const image=new Uint8Array(await response.arrayBuffer());
  if(!valid(image))throw Error('invalid photo bytes or source file exceeds size gate');
  await mkdir(new URL('../public/lake-smoke/',import.meta.url),{recursive:true});
  await writeFile(dest,image);
  console.log('Prepared locally served, licensed Great Lakes steam-fog photograph ('+image.length+' bytes)');
}catch(error){
  // Prevent a transient external image-server outage breaking NOAA-based forecasting.
  console.warn('Local hero preparation unavailable; Commons URL remains the visual fallback: '+error.message);
}
