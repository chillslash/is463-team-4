/** Round-robin selection keeps a large source from monopolising scarce AI calls. */
export function selectSourceBalanced(partners,limit=24){
 const groups=new Map();
 for(const p of partners){
  const k=String(p.source||'Other');
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(p);
 }
 const cmp=(a,b)=>(b.match?.score??0)-(a.match?.score??0)||(a.distanceKm??Infinity)-(b.distanceKm??Infinity)||String(a.name).localeCompare(String(b.name))||String(a.id).localeCompare(String(b.id));
 for(const group of groups.values())group.sort(cmp);
 const keys=[...groups.keys()].sort((a,b)=>cmp(groups.get(a)[0],groups.get(b)[0])||a.localeCompare(b));
 const result=[];
 while(result.length<limit && keys.some(k=>groups.get(k).length)){
  for(const key of keys){
   if(result.length>=limit)break;
   const next=groups.get(key).shift();
   if(next)result.push(next);
  }
 }
 return result;
}
