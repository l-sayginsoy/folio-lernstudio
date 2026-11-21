import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import '../words.js';
const dir=fileURLToPath(new URL('../audio/',import.meta.url));
mkdirSync(dir,{recursive:true});
const scratch=mkdtempSync(join(tmpdir(),'folio-audio-'));
try {
  for (const w of globalThis.WORDS) {
    for (const [part,phrase] of Object.entries({word:w.say,example:w.ex})) {
      if (!phrase) continue;
      execFileSync('say',['-v',process.argv[2]||'Daniel','-r','155','-o',join(scratch,'line.aiff'),'--',phrase]);
      const file=join(dir,w.id+'-'+part+'.m4a');
      execFileSync('afconvert',['-f','m4af','-d','aac',join(scratch,'line.aiff'),file+'.tmp']);
      renameSync(file+'.tmp',file);
    }
  }
} finally {rmSync(scratch,{recursive:true,force:true})}
