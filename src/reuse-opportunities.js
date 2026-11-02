// Manually corroborated public reuse applications. New records require an exact
// organisation identity check, independent official source and dated review.
// These are possible collaboration routes, not consent, acceptance or recipes.
export const CURATED_REUSE_CASES=[
 {
  id:'a1-environment',
  name:'A1 Environment Pte Ltd',
  websiteHost:'a1environment.com.sg',
  confirmingSource:'NEA Food Waste Recycling Facilities',
  evidenceExpression:/accepted materials:\s*(?:used|spent) coffee grounds/i,
  sources:[
   {url:'https://www.a1environment.com.sg/',label:'A1 Environment - Technology and Community',checked:'2026-11-01'},
   {url:'https://www.nea.gov.sg/media/news/news/index/closing-the-food-resource-loop-and-driving-sustainability-at-the-inaugural-food-resource-valorisation-awards',label:'NEA - Food Resource Valorisation Awards (2021)',checked:'2026-11-01'}
  ],
  emailIdea:"I noticed A1's work with Nanyang Polytechnic on coffee-ground bio-composite panels, alongside its recovery routes for farms and community gardens. Could grounds from CoffeeBot be useful for one of these initiatives?",
  opportunities:[
   {
    title:'Coffee-ground bio-composite panels',
    description:'A1 has publicly described developing fire-retardant bio-composite panels made with recovered coffee grounds, including work with Nanyang Polytechnic. These materials have been explored for furniture and other wood-alternative products.',
    collaboration:'CoffeeBot could explore supplying grounds as another possible feedstock for this materials-development route. A1 would need to confirm whether the work is ongoing, the acceptable condition of incoming grounds and any trial-batch requirements.'
   },
   {
    title:'Compost for local farms',
    description:'NEA has documented A1 sending recovered coffee grounds to local organic farms to make compost.',
    collaboration:'CoffeeBot could explore contributing suitable grounds to the A1 farm-compost distribution route if those arrangements are still operating. This would make use of an existing recovery pathway rather than asking A1 to design a new one.'
   },
   {
    title:'Community-garden composting',
    description:'A1 publicly describes providing recovered coffee grounds to community gardens for use in managed gardening and composting activities.',
    collaboration:'CoffeeBot could ask whether A1 has current community-garden partners able to make use of additional grounds. Site permissions, preparation and collection arrangements would remain to be agreed.'
   }
  ],
  firstTrialQuestion:'Which of your existing coffee-ground recovery routes - bio-composite material, farm composting or community-garden use - would currently suit a small batch of CoffeeBot grounds?'
 }
];
const hostname=u=>{try{return new URL(u).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}};
export function curatedReuseCase(p){
 const name=String(p?.name||'').trim().toLowerCase();
 return CURATED_REUSE_CASES.find(c=>c.name.toLowerCase()===name &&
  hostname(p.websiteUrl||'')===c.websiteHost &&
  p.source===c.confirmingSource &&
  p.evidenceEntries?.some(e=>e.source===c.confirmingSource&&c.evidenceExpression.test(e.claim||'')))||null;
}
