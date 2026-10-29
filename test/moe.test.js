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
import {enrichSchoolGardenLocations, SCHOOL_DIRECTORY_URL} from '../src/moe.js';

test('community garden school location uses official directory without inventing acceptance',()=>{
 const school={id:'cib-882',name:'Bedok Green Secondary School',category:'school garden',source:'NParks Community in Bloom open dataset (data.gov.sg)',location:'Singapore · registered Community in Bloom location',lat:1.33394,lon:103.935464,evidenceEntries:[],confirmed:false};
 const manual={...school,id:'cib-abc',name:'Another School',location:'Custom staff-provided address'};
 const contacts=[{school_name:'BEDOK GREEN SECONDARY SCHOOL',address:'360 BEDOK NORTH AVE 3',postal_code:'469722',email_address:'bgss@moe.edu.sg'}];
 assert.equal(enrichSchoolGardenLocations([school,manual],contacts),1);
 assert.equal(school.location,'360 BEDOK NORTH AVE 3 Singapore 469722');
 assert.equal(school.postalCode,'469722');
 assert.equal(school.locationSource,SCHOOL_DIRECTORY_URL);
 assert.equal(school.contactEmail,undefined);
 assert.equal(school.confirmed,false);
 assert.ok(school.evidenceEntries.some(x=>x.url===SCHOOL_DIRECTORY_URL));
 assert.equal(manual.location,'Custom staff-provided address');
});

test('MOE directory websites are retained only when explicitly published and HTTPS',()=>{
 const row={school_name:'Green School',alp_domain:'Environment',alp_title:'Green Gardening Programme',llp_title:''};
 const make=url=>moeSchoolCandidates([row],[{school_name:'Green School',address:'10 Sample Street',postal_code:'123456',url_address:url}],initialState().settings)[0];
 assert.equal(make('https://greenschool.edu.sg').websiteUrl,'https://greenschool.edu.sg/');
 assert.equal(make('http://greenschool.edu.sg').websiteUrl,'');
 assert.equal(make('https://localhost/private').websiteUrl,'');
 assert.equal(make('').websiteUrl,'');
});
