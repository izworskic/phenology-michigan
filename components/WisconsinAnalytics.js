import {useEffect} from 'react';
import {useRouter} from 'next/router';
import {trackWisconsinEvent} from '../lib/bloom/wisconsin-analytics.mjs';
export default function WisconsinAnalytics(){
  const router=useRouter();
  useEffect(()=>{
    trackWisconsinEvent('wi_page_view',{page_path:router.asPath.split(/[?#]/)[0],surface:'page'});
  },[router.asPath]);
  return null;
}
