import test from 'node:test';
import assert from 'node:assert/strict';
import {applyPostalCoordinates,selectOneMapResult,resolveLocations} from '../src/geocode.js';
import {moeSchoolCandidates} from '../src/moe.js';
import {initialState} from '../src/core.js';

const reference=initialState().settings;
test('postal lookup resolves exact Singapore postal codes without AI',()=>{
 const records=[{name:'Example',location:'Singapore 758056',lat:null,lon:null,distanceKm:null},{name:'No address',location:'Address not recorded',lat:null,lon:null,distanceKm:null}];
 const resolved=applyPostalCoordinates(records,reference,{'758056':{lat:'1.4551',lon:'103.8061'}});
 assert.equal(resolved,1);
 assert.ok(records[0].distanceKm>0&&records[0].distanceKm<50);
 assert.equal(records[0].coordinateSource,'Singapore postal coordinate snapshot (2023)');
 assert.equal(records[1].distanceKm,null);
});
test('ambiguous or outside-Singapore matches never create invented distances',async()=>{
 const p=[{location:'Singapore 758056',lat:null,lon:null,distanceKm:null}];
 assert.equal(applyPostalCoordinates(p,reference,{'758056':{lat:50.1,lon:-0.1}}),0);
 const result=await resolveLocations(p,reference,{lookup:{},allowOneMap:false});
 assert.equal(result.unresolved,1);
 const a={POSTAL:'758056',LATITUDE:'1.4551',LONGITUDE:'103.8061',BUILDING:'EXAMPLE WASTE FACILITY',ADDRESS:'Singapore 758056'};
 const b={...a,POSTAL:'758057',LONGITUDE:'103.8123'};
 assert.ok(selectOneMapResult([a],{name:'Example Waste Facility',location:''}));
 assert.equal(selectOneMapResult([a,b],{name:'Example Waste Facility',location:''}),null);
 assert.equal(selectOneMapResult([a],{name:'Unrelated Company',location:''}),null);
});
test('MOE name normalisation links official address and postal code',()=>{
 const rows=moeSchoolCandidates(
  [{school_name:'Ang Mo Kio Secondary',alp_domain:'Environment',alp_title:'Green programme'},{school_name:'Catholic High School (Primary)',alp_domain:'Environment',alp_title:'Nature programme'}],
  [{school_name:'ANG MO KIO SECONDARY SCHOOL',address:'6 ANG MO KIO STREET 22',postal_code:'569362'},{school_name:'CATHOLIC HIGH SCHOOL',address:'9 BISHAN STREET 22',postal_code:'579767'}],
  reference);
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(p=>p.postalCode),['569362','579767']);
 assert.match(rows[0].location,/569362/);
});
