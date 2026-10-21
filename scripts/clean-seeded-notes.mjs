import {readFile,writeFile,rename,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {cleanSeededPartnerNotes,cleanGeneratedReuseClaims} from '../server.js';
const file=resolve(process.env.DATA_FILE||'data/state.json');
const state=JSON.parse(await readFile(file,'utf8'));
const result=cleanSeededPartnerNotes(state.partners||[]);
const uses=cleanGeneratedReuseClaims(state.partners||[]);
result.cleaned+=uses.cleaned;result.assessmentsPreserved+=uses.assessmentsPreserved;
if(result.cleaned){
 const backup=resolve(dirname(file),'source-notes-cleanup-backup.json');
 try{await copyFile(file,backup,1);}catch(e){if(e.code!=='EEXIST')throw e;}
 const temp=file+'.'+randomUUID()+'.tmp';
 await writeFile(temp,JSON.stringify(state,null,2)+'\n','utf8');
 await rename(temp,file);
 console.log('Cleaned '+result.cleaned+' boilerplate Notes; retained '+result.assessmentsPreserved+' AI assessments with original hash provenance. Backup: '+backup);
}else console.log('No remaining generated partner Notes.');
