import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSfaTextPages,SFA_URL,SFA_SOURCE} from '../src/sfa.js';

const item=(str,x,y)=>({str,x,y});
const row=(n,code,name,y,section)=>[
 item(String(n),79,y),
 ...(section?[item(section,89,y)]:[]),
 item(code,209,y),
 item(name,302,y)
];

test('SFA parser keeps crop and mixed vegetable licences without importing aquaculture or livestock',()=>{
 const pages=[
  [item('LIST OF LICENSED LAND BASED FARMS [Last updated 2 October 2026]',90,870),
   ...row(1,'7521I051','Golden Cap Farm LLP',830,'Vegetable Farming'),
   ...row(2,'1523A088','Golden Cap Farm LLP',820),
   ...row(3,'3323E094','Hydroponic Green Farm Pte Ltd',810),
   ...row(4,'6920H022','Fish Aquarium Pte Ltd',800,'Aquaculture Farms')],
  [item('LIST OF LICENSED LAND BASED FARMS [Last updated 2 October 2026]',90,870),
   ...row(5,'7199Z024','Egg Producer Pte Ltd',830),
   ...row(6,'7122C066','Cropciti Pte Ltd',820,'Aquaculture and Vegetable Farms'),
   ...row(7,'7199Z050','Dairy Test Pte Ltd',810,'Dairy cattle Farms')]
 ];
 const result=parseSfaTextPages(pages);
 assert.equal(result.registerUpdated,'2 October 2026');
 assert.equal(result.licensedRows,4);
 assert.equal(result.candidates.length,3);
 const farm=result.candidates.find(p=>p.name==='Golden Cap Farm LLP');
 assert.equal(farm.source,SFA_SOURCE);
 assert.equal(farm.sourceUrl,SFA_URL);
 assert.equal(farm.sfaLicenceCount,2);
 assert.match(farm.evidenceEntries[0].claim,/7521I051, 1523A088/);
 assert.equal(farm.capacityKg,null);
 assert.equal(farm.confirmed,false);
 assert.equal(farm.verified,false);
 assert.equal(farm.contactEmail,'');
 assert.equal(farm.use,'');
 assert.equal(farm.lat,null);
 assert.equal(result.candidates.find(p=>p.name==='Hydroponic Green Farm Pte Ltd').category,'crop farm');
 assert.equal(result.candidates.find(p=>p.name==='Cropciti Pte Ltd').category,'mixed crop/aquaculture farm');
 assert.ok(!result.candidates.some(p=>/Fish Aquarium|Dairy Test|Egg Producer/.test(p.name)));
});

test('SFA parser fails closed if the agency document no longer has the expected structure',()=>{
 assert.throws(()=>parseSfaTextPages([]),/no pages/);
 assert.throws(()=>parseSfaTextPages([[item('Some unrelated PDF',90,800)]]),/format not recognised/);
});
