/** Build an explicit public allowlist. Repository files never become web assets. */
import {cp,mkdir,readdir,rm,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const source=fileURLToPath(new URL('./',import.meta.url));
const output=path.resolve(source,'../public-demo');
const files=['index.html','styles.css','sw.js','manifest.webmanifest','icon.svg'];
const modules=['app.js','data.js','icons.js','charts.js','motion.js','assistant.js'];
const icons=['icon-192.png','icon-512.png','apple-touch-icon.png'];
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const name of files)await cp(path.join(source,name),path.join(output,name));
for(const [folder,names] of [['js',modules],['assets',icons]]){
  await mkdir(path.join(output,folder));
  for(const name of names)await cp(path.join(source,folder,name),path.join(output,folder,name));
}
// Canonical text bytes keep Windows local builds identical to Linux deployments.
for (const name of [...files,...modules.map(n=>'js/'+n)]) {
  const target=path.join(output,name);
  await writeFile(target,(await readFile(target,'utf8')).replaceAll('\r\n','\n'));
}
const count=(await readdir(output,{recursive:true,withFileTypes:true})).filter(entry=>entry.isFile()).length;
if(count!==14)throw new Error('Unexpected public asset count');
console.log('Built public-demo: 14 allowlisted public files; no tests, docs, dependencies, SQL or repository metadata.');
