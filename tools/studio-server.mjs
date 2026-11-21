// Optional local server for short, word-specific AI explanations.
import http from 'node:http';
import {readFile,stat,mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,extname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import '../words.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.FOLIO_PORT||4387),host='127.0.0.1';
const origin='http://'+host+':'+port;
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.m4a':'audio/mp4','.wav':'audio/wav','.ttf':'font/ttf'};
const files=new Set(['index.html','lernblatt-englisch-test.html','studio.css','studio.js','words.js','situations.js']);
const run=promisify(execFile);
const scratch=await mkdtemp(join(tmpdir(),'folio-teacher-'));
const tutor=join(scratch,'FolioTutor');
const ready=(async()=>{
  if(process.platform!=='darwin')return false;
  try{
    await run('xcrun',['swiftc','-parse-as-library','-O',join(root,'tools/FolioTutor.swift'),'-o',tutor],{timeout:120000});
    return (await run(tutor,[],{timeout:10000})).stdout.trim()==='ready';
  }catch{return false}
})();
const cache=new Map();
async function explanation(id){
  const w=globalThis.WORDS.find(w=>w.id===id);
  const result=await run(tutor,[w.en,w.de,w.ex||''],{timeout:60000,maxBuffer:128*1024});
  const text=result.stdout.trim();
  if(!text||text==='unavailable')throw Error('Model unavailable');
  return text;
}
function sendRecording(req,res,bytes,type) {
  const size=bytes.length;
  const headers={'Content-Type':type,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
  const range=req.headers.range;
  let start=0,end=size-1;
  if(range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(match && (match[1] || match[2])){
      start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
      end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
    }else start=size;
    if(start>=size||end<start){
      res.writeHead(416,{...headers,'Content-Range':'bytes */'+size,'Content-Length':0});
      res.end();return;
    }
    headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
  }
  headers['Content-Length']=end-start+1;
  res.writeHead(range?206:200,headers);
  res.end(req.method==='HEAD'?undefined:bytes.subarray(start,end+1));
}
const server=http.createServer(async(req,res)=>{
  const reply=(code,value,type='application/json')=>{res.writeHead(code,{'Content-Type':type,'X-Content-Type-Options':'nosniff'});res.end(type==='application/json'?JSON.stringify(value):value)};
  if(req.headers.host!==host+':'+port)return reply(400,{});
  try{
    const path=new URL(req.url,origin).pathname;
    if(req.method==='GET'&&path==='/api/status')return reply(200,{enabled:await ready});
    if(path.startsWith('/api/explain/')){
      if(req.method!=='POST'||req.headers.origin!==origin||!await ready)return reply(403,{});
      const id=path.slice('/api/explain/'.length);
      if(!globalThis.WORDS.some(w=>w.id===id))return reply(404,{});
      if(!cache.has(id))cache.set(id,explanation(id).catch(e=>{cache.delete(id);throw e}));
      return reply(200,{text:await cache.get(id)});
    }
    const name=path==='/'?'index.html':path.slice(1);
    if((req.method!=='GET'&&!(req.method==='HEAD'&&name.startsWith('audio/')))||(!files.has(name)&&!(/^(assets|audio)\/[a-z\d.-]+$/i.test(name))))return reply(404,{});
    const target=join(root,name);if(!(await stat(target)).isFile())return reply(404,{});
    const bytes=await readFile(target),type=types[extname(name)]||'application/octet-stream';
    if(name.startsWith('audio/'))return sendRecording(req,res,bytes,type);
    return reply(200,bytes,type);
  }catch(e){reply(e.code==='ENOENT'?404:503,{error:'Die Erklärung ist gerade nicht verfügbar.'})}
});
server.listen(port,host,()=>console.log('Lernstudio läuft auf '+origin));

for(const sig of ['SIGTERM','SIGINT'])process.once(sig,async()=>{await rm(scratch,{recursive:true,force:true});process.exit(0)});
