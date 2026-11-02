import {generateReuseGuide} from './reuse-guide.js';
import {curatedReuseCase} from './reuse-opportunities.js';

// Keep the first email short. Deeper research belongs in the partner record.
export function cleanOutreachText(value) {
 let s=String(value??'');
 for(const [from,to] of [
  ['\u00e2\u20ac\u2122',"'"],['\u00e2\u20ac\u201d',' - '],
  ['\u00e2\u20ac\u201c',' - '],['\u2019',"'"],['\u2014',' - '],
  ['\u00e2\u20ac\u0153','"'],['\u00c2\u00a0',' ']
 ])s=s.split(from).join(to);
 return s.replace(/&#(?:x20|32);|&nbsp;/gi,' ').replace(/[ \t]{2,}/g,' ').replace(/ *\n */g,'\n').trim();
}
export function outreachReuseIdea(p) {
 const curated=curatedReuseCase(p);
 if(curated?.emailIdea)return cleanOutreachText(curated.emailIdea);
 const guide=generateReuseGuide(p);
 return cleanOutreachText(guide.sections.pathway.split('\n\n')[0].replace(/^\d+\.\s*/,''));
}
export function outreachEmailBody(p,salutation) {
 return cleanOutreachText(salutation+'\n\n'+
  "I'm reaching out from CoffeeBot. We operate coffee machines in Singapore and actively collect the spent coffee grounds as part of our efforts to reduce waste and find practical reuse partners.\n\n"+
  outreachReuseIdea(p)+'\n\n'+
  "If this could be relevant to your work, we'd be happy to discuss a small trial and any collection or material requirements. Would your team be open to a brief conversation?\n\n"+
  'Best regards,\nCoffeeBot Partnerships');
}
export const emailWordCount=text=>String(text||'').trim().split(/\s+/).filter(Boolean).length;
export function isConciseFirstEmail(body,idea) {
 const s=cleanOutreachText(body);
 return emailWordCount(s)>=45 && emailWordCount(s)<=185 &&
  s.split(/\n\s*\n/).length<=6 && s.includes(cleanOutreachText(idea)) &&
  !/\bmoisture\b|\bunmeasured\b|\bnot measured\b/i.test(s) &&
  !/^\s*#{1,6}\s|<[^>]+>|&#x[0-9a-f]+;/im.test(s);
}
