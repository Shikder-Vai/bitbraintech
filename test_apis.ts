import { Innertube, UniversalCache, Platform } from 'youtubei.js';

Platform.shim.eval = (data, env) => {
  const properties = [];
  if(env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
  if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
  const code = `${data.output}\nreturn { ${properties.join(', ')} }`;
  return new Function(code)();
};

async function test() {
  try {
    console.log("Testing youtubei.js...");
    const yt = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      clientType: 'TV_EMBEDDED',
    });
    const info = await yt.getInfo('dQw4w9WgXcQ');
    const format = info.chooseFormat({ type: 'video+audio', quality: 'best' });
    
    if (format) {
      const decipheredUrl = await format.decipher(yt.session.player);
      console.log(decipheredUrl ? "Success: URL found" : "No URL found");
    } else {
      console.log("No format found");
    }
  } catch(e: any) { console.log(e.message); }
}
test();
