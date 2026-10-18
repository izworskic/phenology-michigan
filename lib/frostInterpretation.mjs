/* Visitor-first frost interpretation tied to the chosen NWS dawn forecast.
 * Never infer that frost has been observed, classify ice from a forecast,
 * or manufacture a surface temperature from standard-height air readings.
 */
export function nearestSunriseHour(morning){
  const sunrise=Date.parse(morning?.photo?.sunriseAt||'');
  if(!Number.isFinite(sunrise))return null;
  const hours=(morning?.hourly||[]).filter(h=>Number.isFinite(h?.score)&&Number.isFinite(Date.parse(h.time)));
  const closest=[...hours].sort((a,b)=>Math.abs(Date.parse(a.time)-sunrise)-Math.abs(Date.parse(b.time)-sunrise))[0];
  return closest&&Math.abs(Date.parse(closest.time)-sunrise)<=90*60000?closest:null;
}
const number=x=>Number.isFinite(x)?Math.round(x):null;
export function guideWeather(morning){
  const sample=nearestSunriseHour(morning);
  if(!sample)return {available:false,sky:'Unknown',wind:'Unknown',moisture:'Unknown',temperature:'Unknown',
    note:'The NWS forecast has no complete hour close enough to sunrise. Explore the science here, but do not read this as a local prediction.',
    factors:[]};
  const {tempF,dewF,windMph,skyPct}=sample;
  const spread=tempF-dewF;
  const sky=skyPct<=30?'A relatively open sky':skyPct<=65?'A partly covered sky':'A mostly cloudy sky';
  const wind=windMph<=3?'Light wind':windMph<=7?'Some air movement':'Windier conditions';
  const moisture=spread<=3?'Moist air':spread<=8?'Some moisture available':'Drier air';
  const temperature=tempF<=32?'Air below freezing':tempF<=37?'Air near freezing':'Air above a typical frost setup';
  const factors=[
    {id:'sky',label:'The sky',value:number(skyPct)+'% cloud cover',condition:sky,
      explanation:skyPct<=30?'A clearer sky lets grass and exposed branches lose heat toward the night sky. What you would actually see depends on local clouds.':
        skyPct<=65?'Some openings could help surfaces cool, but changing cloud cover makes the overnight story less straightforward.':
        'Clouds can act like a blanket, limiting how quickly exposed surfaces lose heat. The forecast does not say what every field will see.'},
    {id:'wind',label:'The wind',value:number(windMph)+' mph',condition:wind,
      explanation:windMph<=3?'Near-still air can let a thin layer of cold air settle near grass and in sheltered hollows.':
        windMph<=7?'A light breeze mixes the air close to the ground; sheltered corners may behave differently from open fields.':
        'More wind can mix warmer air down and disrupt a very cold layer right next to grass and twigs.'},
    {id:'moisture',label:'The moisture',value:number(Math.max(0,spread))+'°F air–dew gap',condition:moisture,
      explanation:spread<=3?'A small gap between air temperature and dew point suggests moisture is readily available. It still does not show that ice has formed.':
        spread<=8?'There is some moisture to work with, but whether a particular leaf or twig gets cold enough remains unknown.':
        'A wider dew-point gap means drier air. Even a cold morning may leave little visible ice behind.'},
    {id:'cold',label:'The cold',value:number(tempF)+'°F forecast air',condition:temperature,
      explanation:tempF<=32?'Air is forecast below freezing. But that alone cannot tell us whether crystals grow or which surfaces turn white.':
        tempF<=37?'Even with air a little above 32°F, exposed grass may cool below freezing on a clear, calm night. The tool cannot calculate its actual surface temperature.':
        'Air is relatively warm for widespread delicate frost. Small cold pockets can differ from a regional weather grid, so avoid a precise local claim.'}
  ];
  const visibility=sample.visibilityMi;
  const caution=Number.isFinite(visibility)&&visibility<=1&&tempF<=36;
  const note=caution?
    'Forecast visibility near freezing is low. Fog, rime and slippery travel are possible. Check local observations and NWS alerts before setting out.':
    'These are conditions near sunrise from a representative NWS forecast grid—not observed ice or a measurement on your lawn.';
  return {available:true,sky,wind,moisture,temperature,note,caution,factors,forecastAt:sample.time};
}
export const fieldFinds={
  crystals:{
    label:'Feathery crystals on twigs',
    title:'Look closely at the edges',
    message:'Delicate, branching crystals can be hoarfrost. Water vapor may deposit directly as ice when exposed surfaces are cold enough. Shape is a clue, not certain identification from a distance.',
    question:'Are the crystals airy and clearly attached to exposed stems or wires?'
  },
  beads:{
    label:'Tiny beads on grass',
    title:'Was it dew first?',
    message:'Liquid dew can form and later freeze into small hard beads. That is frozen dew rather than ice deposited directly from vapor. A photograph alone may not reveal the full sequence.',
    question:'Do the coatings resemble little frozen droplets instead of feathery growth?'
  },
  rime:{
    label:'Opaque white coating in fog',
    title:'Think of freezing droplets',
    message:'Rime can build when supercooled fog droplets strike an object and freeze. A dense, opaque coating may suggest it, but local fog and surface conditions must be checked.',
    question:'Was there fog or mist when the branches whitened?'
  },
  none:{
    label:'Nothing turned white',
    title:'That is a useful observation',
    message:'A promising forecast does not guarantee frost. The ground, nearby water, shelter and even a slight breeze can change the result. Compare the real scene with the forecast clues rather than treating a score as proof.',
    question:'Was the field breezy, cloudy, or noticeably different from the forecast area?'
  }
};
