export function rankingMetrics(rows){
 const validRows=rows.filter(x=>Number.isFinite(x.score));
 if(!validRows.length)return {count:rows.length,valid:0,coverage:0,ndcgAt10:null,ndcgAll:null,pairwiseAccuracy:null,plausibleAt10:null,top:[]};
 const sorted=[...validRows].sort((a,b)=>(b.score??-1)-(a.score??-1)||a.id.localeCompare(b.id));
 const ideal=[...validRows].sort((a,b)=>b.tier-a.tier);
 const dcg=(list,k)=>list.slice(0,k).reduce((sum,x,i)=>sum+(2**x.tier-1)/Math.log2(i+2),0);
 const ndcg=k=>dcg(ideal,k)?+(dcg(sorted,k)/dcg(ideal,k)).toFixed(4):null;
 let n=0,wins=0;
 for(let i=0;i<validRows.length;i++)for(let j=i+1;j<validRows.length;j++){
  const a=validRows[i],b=validRows[j];if(a.tier===b.tier)continue;
  n++;const d=(a.score??-1)-(b.score??-1);wins+=d===0?.5:(d*(a.tier-b.tier)>0?1:0);
 }
 return {count:rows.length,valid:validRows.length,coverage:+(validRows.length/rows.length).toFixed(4),ndcgAt10:ndcg(10),
  ndcgAll:ndcg(validRows.length),pairwiseAccuracy:n?+(wins/n).toFixed(4):null,
  plausibleAt10:sorted.slice(0,10).filter(x=>x.tier>=2).length,
  top:sorted.slice(0,10).map(({id,name,score,tier})=>({id,name,score,tier}))};
}
