import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {join,dirname} from 'node:path';
const path=join(process.cwd(),'data','source-cache','sg-postal-coordinates-2023.json');
const source='https://raw.githubusercontent.com/faezlatiff/SingaporePostalToLatLong/main/postal_codes_22_06_2023.json';
const valid=data=>data&&typeof data==='object'&&Object.keys(data).length>100000&&Number(data['486748']?.lat)>1;
try{if(valid(JSON.parse(await readFile(path,'utf8')))){console.log('Postcode cache already available');process.exit(0);}}catch{}
const response=await fetch(source);if(!response.ok)throw Error('Postcode download HTTP '+response.status);
const text=await response.text();if(text.length>25000000||!valid(JSON.parse(text)))throw Error('Invalid postal dataset');
await mkdir(dirname(path),{recursive:true});await writeFile(path+'.tmp',text);await rename(path+'.tmp',path);
console.log('Saved Singapore postcode coordinate snapshot (2023)');
