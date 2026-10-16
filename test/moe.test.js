import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,moeSchoolCandidates} from '../src/moe.js';
import {initialState} from '../src/core.js';

test('MOE CSV parser preserves quoted commas and school addresses',()=>{
 const rows=parseCSV('school_name,alp_domain,alp_title\r\n"Eco, Green School",STEM - Sustainability,"Growing, Greener"\r\n');
 assert.equal(rows.length,1);assert.equal(rows[0].school_name,'Eco, Green School');
 assert.equal(rows[0].alp_title,'Growing, Greener');
});
test('school leads require programme evidence and do not claim an accepting garden',()=>{
 const p=moeSchoolCandidates([
  {school_name:'Green School',alp_domain:'STEM - Sustainability',alp_title:'Learning about climate',llp_title:''},
  {school_name:'Ordinary School',alp_domain:'Languages',alp_title:'Storytelling',llp_title:''}
 ],[{school_name:'GREEN SCHOOL',address:'10 Sample Street',postal_code:'123456'}],initialState().settings);
 assert.equal(p.length,1);
 assert.equal(p[0].category,'school programme');
 assert.match(p[0].use,/does NOT establish a garden/);
 assert.equal(p[0].verified,false);assert.equal(p[0].confirmed,false);
 assert.equal(p[0].capacityKg,null);assert.equal(p[0].distanceKm,null);
 assert.equal(p[0].evidenceEntries.length,2);
 assert.ok(p[0].evidenceEntries.every(e=>e.url.startsWith('https://data.gov.sg/')));
});