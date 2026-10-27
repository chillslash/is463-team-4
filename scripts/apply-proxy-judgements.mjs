// Materialise a frozen, proxy-labelled copy of the independently sampled review.
// Labels come from scripts/proxy-review-judgements.json; model score outputs are never read.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const m=x.match(/^--([a-z-]+)=(.+)$/);if(!m)throw Error('Expected --name=value');return [m[1],m[2]];}));
const labels=JSON.parse(await readFile(new URL('./proxy-review-judgements.json',import.meta.url),'utf8'));
const review=JSON.parse(await readFile(args.review||'data/sponsor-review.json','utf8'));
const byId=new Map(labels.cases.map(x=>[x.id,x]));
if(byId.size!==labels.cases.length)throw new Error('Duplicate proxy labels');
if(review.cases.length!==byId.size||review.cases.some(c=>!byId.has(c.id)))throw new Error('Review candidate snapshot does not match the frozen proxy cohort');
review.reviewerRole='Independent proxy';
review.reviewedBy=labels.assessor;
review.reviewedAt=labels.assessedAt;
review.purpose=labels.target;
review.guidance='Proxy desktop review. Model scores were not inspected before labels were frozen. Not CoffeeBot judgement or observed acceptance.';
for(const c of review.cases){
 const l=byId.get(c.id);
 if(!Number.isInteger(l.outreachPriority)||l.outreachPriority<0||l.outreachPriority>3)throw new Error('Invalid frozen grade for '+c.id);
 c.review.outreachPriority=l.outreachPriority;
 c.review.confidence='provisional';
 c.review.rationale=l.rationale;
 c.review.openQuestions='Confirm capacity, permission, fees, reuse method and recurring arrangements directly';
}
const out=args.out||'data/proxy-review-labelled.json';
await writeFile(out,JSON.stringify(review,null,2)+'\n',{flag:'wx'});
console.log('Saved '+review.cases.length+' frozen proxy reviews to '+out);
