import {defineConfig,loadEnv} from 'vite';
import {readdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export default defineConfig(({mode})=>{const values={...loadEnv(mode,process.cwd(),''),...process.env};if(mode==='production'&&values.VITE_USE_FIREBASE_EMULATORS==='true')throw new Error('Refusing a production build with Firebase emulators enabled.');const outputDir=process.env.PALSUM_BUILD_DIR||'dist';return ({
  plugins:[{
    name:'palsum-offline-shell',
    async closeBundle(){
      const assets=await readdir(join(outputDir,'assets'));
      const shell=['./','./index.html','./app.js','./styles.css','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png',...assets.filter(n=>/\.(js|css)$/.test(n)).map(n=>'./assets/'+n)];
      const source=await import('node:fs/promises').then(fs=>fs.readFile('public/sw.js','utf8'));
      await writeFile(join(outputDir,'sw.js'),source.replace('/* BUILD_ASSETS */ []',JSON.stringify(shell)));
    }
  }],
  build:{target:'es2022',outDir:outputDir},
  define:{__PALSUM_TEST_MODE__:JSON.stringify(mode==='test')}
})});
