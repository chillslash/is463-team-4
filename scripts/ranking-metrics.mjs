export function rankingMetrics(rows){
 const sorted=[...rows].sort((a,b)=>(b.score??-1)-(a.score??-1)||a.id.localeCompare(b.id));
 const ideal=[...rows].sort((a,b)=>b.tier-a.tier);
 const dcg=(list,k)=>list.slice(0,k).reduce((sum,x,i)=>sum+(2**x.tier-1)/Math.log2(i+2),0);
 const ndcg=k=>dcg(ideal,k)?+(dcg(sorted,k)/dcg(ideal,k)).toFixed(4):null;
 let n=0,wins=0;
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const a=rows[i],b=rows[j];if(a.tier===b.tier)continue;
  n++;const d=(a.score??-1)-(b.score??-1);wins+=d===0?.5:(d*(a.tier-b.tier)>0?1:0);
 }
 return {count:rows.length,valid:rows.filter(x=>x.score!==null).length,ndcgAt10:ndcg(10),
  ndcgAll:ndcg(rows.length),pairwiseAccuracy:n?+(wins/n).toFixed(4):null,
  plausibleAt10:sorted.slice(0,10).filter(x=>x.tier>=2).length,
  top:sorted.slice(0,10).map(({id,name,score,tier})=>({id,name,score,tier}))};
}
