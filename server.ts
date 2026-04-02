import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Innertube, UniversalCache, Platform } from 'youtubei.js';

// Set up custom JS evaluator for youtubei.js
Platform.shim.eval = (data, env) => {
  const properties = [];
  if(env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
  if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
  const code = `${data.output}\nreturn { ${properties.join(', ')} }`;
  return new Function(code)();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration Constants
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
];

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Set headers for ffmpeg.wasm (SharedArrayBuffer)
  app.use((req, res, next) => {
    res.header("Cross-Origin-Embedder-Policy", "require-corp");
    res.header("Cross-Origin-Opener-Policy", "same-origin");
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy endpoint for video downloads to bypass CORS
  app.post("/api/download", express.json(), async (req, res) => {
    try {
      const { url, videoQuality } = req.body;
      
      if (!url) {
        return res.status(400).json({ status: "error", text: "URL is required" });
      }

      try {
        new URL(url);
      } catch (e) {
        return res.status(400).json({ status: "error", text: "Invalid URL format. Please provide a full URL (e.g., https://youtube.com/...)" });
      }

      console.log(`Processing download request for: ${url}`);
      const debugErrors: string[] = [];
      const logError = (service: string, err: any) => {
        const msg = err?.message || String(err) || "Unknown error";
        console.error(`${service} failed:`, msg);
        debugErrors.push(`${service}: ${msg}`);
      };

      // --- YOUTUBE DOWNLOADER ---
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoIdMatch = url.match(/(?:v=|\/|be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        if (videoId) {
          // YouTube Fallback: youtubei.js
          try {
            console.log(`Trying youtubei.js fallback for: ${videoId}`);
            const { Innertube, UniversalCache, Platform } = await import('youtubei.js');
            
            Platform.shim.eval = (data, env) => {
              const properties = [];
              if(env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
              if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
              const code = `${data.output}\nreturn { ${properties.join(', ')} }`;
              return new Function(code)();
            };

            const yt = await Innertube.create({
              cache: new UniversalCache(false),
              generate_session_locally: true,
              clientType: 'WEB',
            });
            const info = await yt.getInfo(videoId);
            const format = info.chooseFormat({ type: 'video+audio', quality: 'best' });
            
            if (format) {
              const decipheredUrl = await format.decipher(yt.session.player);
              if (decipheredUrl) {
                return res.json({
                  status: 'stream',
                  url: decipheredUrl,
                  filename: `${info.basic_info?.title || info.primary_info?.title?.text || 'youtube_video'}.mp4`
                });
              }
            }
          } catch (e: any) {
            logError("youtubei.js", e);
          }

          // YouTube Fallback: SaveFrom
          try {
            console.log(`Trying SaveFrom YouTube fallback for: ${videoId}`);
            const { savefrom } = await import('@bochilteam/scraper-savefrom');
            const sfRes = await savefrom(url);
            if (sfRes && sfRes.length > 0 && sfRes[0].url) {
              let bestUrl = '';
              let bestQuality = -1;
              for (const format of sfRes[0].url) {
                if (format.type === 'mp4' && format.url) {
                  const qualityMatch = format.name.match(/(\d+)p/i) || format.name.match(/(\d+)/);
                  const quality = qualityMatch ? parseInt(qualityMatch[1]) : 0;
                  if (quality > bestQuality) {
                    bestQuality = quality;
                    bestUrl = format.url;
                  }
                }
              }
              if (bestUrl) {
                return res.json({ status: 'stream', url: bestUrl, filename: `${sfRes[0].meta?.title || 'video'}.mp4` });
              } else if (sfRes[0].url[0] && sfRes[0].url[0].url) {
                return res.json({ status: 'stream', url: sfRes[0].url[0].url, filename: `${sfRes[0].meta?.title || 'video'}.mp4` });
              }
            }
          } catch (e: any) {
            logError("SaveFrom YouTube", e);
          }

          // YouTube Fallback: Vevioz (Direct attempt for YouTube)
          try {
            console.log(`Trying Vevioz YouTube fallback for: ${videoId}`);
            const veviozRes = await fetch(`https://api.vevioz.com/api/button/videos/${encodeURIComponent(url)}`);
            if (veviozRes.ok) {
              const veviozHtml = await veviozRes.text();
              const downloadUrlMatch = veviozHtml.match(/href=["']([^"']+)["'][^>]*class=["'][^"']*download-button[^"']*["']/i) ||
                                       veviozHtml.match(/href=["']([^"']+)["'][^>]*download/i);
              if (downloadUrlMatch && downloadUrlMatch[1]) {
                return res.json({
                  status: 'stream',
                  url: downloadUrlMatch[1],
                  filename: 'youtube_video.mp4'
                });
              }
            }
          } catch (e: any) {
            logError("Vevioz YouTube", e);
          }

          // YouTube Fallback: Y2Mate
          try {
            console.log(`Trying Y2Mate YouTube fallback for: ${videoId}`);
            const y2Res = await fetch("https://www.y2mate.com/mates/en68/analyze/ajax", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: `url=${encodeURIComponent(url)}&q_auto=0&ajax=1`
            });
            if (y2Res.ok) {
              const y2Data = await y2Res.json();
              if (y2Data.status === 'success') {
                const dlMatch = y2Data.result.match(/data-ftype=["']mp4["'][^>]*data-fquality=["'](720|360|480|1080)["'][^>]*href=["']([^"']+)["']/i);
                if (dlMatch && dlMatch[2]) {
                  return res.json({ status: 'stream', url: dlMatch[2], filename: 'youtube_video.mp4' });
                }
              }
            }
          } catch (e: any) {
            logError("Y2Mate", e);
          }

          // YouTube Fallback: YT1s
          try {
            console.log(`Trying YT1s YouTube fallback for: ${videoId}`);
            const yt1sRes = await fetch("https://yt1s.com/api/ajaxSearch/index", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENTS[0] },
              body: `q=${encodeURIComponent(url)}&vt=home`
            });
            if (yt1sRes.ok) {
              const yt1sData = await yt1sRes.json();
              if (yt1sData.links && yt1sData.links.mp4) {
                const qualities = Object.keys(yt1sData.links.mp4).sort((a, b) => parseInt(b) - parseInt(a));
                const bestQuality = qualities[0];
                if (bestQuality) {
                  const vid = yt1sData.vid;
                  const k = yt1sData.links.mp4[bestQuality].k;
                  
                  const convertRes = await fetch("https://yt1s.com/api/ajaxConvert/convert", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENTS[0] },
                    body: `vid=${vid}&k=${encodeURIComponent(k)}`
                  });
                  
                  if (convertRes.ok) {
                    const convertData = await convertRes.json();
                    if (convertData.dlink) {
                      return res.json({ status: 'stream', url: convertData.dlink, filename: `${yt1sData.title || 'youtube_video'}.mp4` });
                    }
                  }
                }
              }
            }
          } catch (e: any) {
            logError("YT1s", e);
          }
        }
      }

      // --- TIKTOK DOWNLOADER ---
      if (url.includes('tiktok.com')) {
        // Fallback 1: TikWM
        try {
          const tikwmRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
          const tikwmData = await tikwmRes.json();
          if (tikwmData.code === 0 && tikwmData.data && tikwmData.data.play) {
            return res.json({
              status: 'stream',
              url: `https://www.tikwm.com${tikwmData.data.play}`,
              filename: tikwmData.data.title || "tiktok_video.mp4"
            });
          }
        } catch (e: any) {
          logError("TikWM", e);
        }

        // Fallback 2: SSSTik (Scraping-like)
        try {
          const sssRes = await fetch("https://ssstik.io/abc?url=dl", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `id=${encodeURIComponent(url)}&locale=en&tt=0`
          });
          if (sssRes.ok) {
            const html = await sssRes.text();
            const dlMatch = html.match(/href=["']([^"']+)["'][^>]*class=["'][^"']*download_link[^"']*["']/i);
            if (dlMatch && dlMatch[1]) {
              return res.json({ status: 'stream', url: dlMatch[1], filename: "tiktok_video.mp4" });
            }
          }
        } catch (e: any) {
          logError("SSSTik", e);
        }
      }

      // --- INSTAGRAM DOWNLOADER ---
      if (url.includes('instagram.com')) {
        // Fallback 1: SnapInsta
        try {
          const snapRes = await fetch(`https://api.snapinsta.app/api/v1/download?url=${encodeURIComponent(url)}`, {
            headers: { 'User-Agent': USER_AGENTS[0] }
          });
          const snapData = await snapRes.json();
          if (snapData.status === 'success' && snapData.data && snapData.data.length > 0) {
            return res.json({
              status: 'stream',
              url: snapData.data[0].url,
              filename: "instagram_video.mp4"
            });
          }
        } catch (e: any) {
          logError("SnapInsta", e);
        }

        // Fallback 2: SaveFrom.net logic (Generic)
        try {
          const { savefrom } = await import('@bochilteam/scraper-savefrom');
          const sfRes = await savefrom(url);
          if (sfRes && sfRes.length > 0 && sfRes[0].url) {
            let bestUrl = '';
            let bestQuality = -1;
            for (const format of sfRes[0].url) {
              if (format.type === 'mp4' && format.url) {
                const qualityMatch = format.name.match(/(\d+)p/i) || format.name.match(/(\d+)/);
                const quality = qualityMatch ? parseInt(qualityMatch[1]) : 0;
                if (quality > bestQuality) {
                  bestQuality = quality;
                  bestUrl = format.url;
                }
              }
            }
            if (bestUrl) {
              return res.json({ status: 'stream', url: bestUrl, filename: "instagram_video.mp4" });
            } else if (sfRes[0].url[0] && sfRes[0].url[0].url) {
              return res.json({ status: 'stream', url: sfRes[0].url[0].url, filename: "instagram_video.mp4" });
            }
          }
        } catch (e: any) {
          logError("SaveFrom IG", e);
        }
      }

      // --- TWITTER / X DOWNLOADER ---
      if (url.includes('twitter.com') || url.includes('x.com')) {
        // Fallback 1: Twitsave
        try {
          const twitRes = await fetch(`https://twitsave.com/api/v1/download?url=${encodeURIComponent(url)}`, {
            headers: { 'User-Agent': USER_AGENTS[0] }
          });
          const twitData = await twitRes.json();
          if (twitData.status === 'success' && twitData.data && twitData.data.length > 0) {
            return res.json({
              status: 'stream',
              url: twitData.data[0].url,
              filename: "twitter_video.mp4"
            });
          }
        } catch (e: any) {
          logError("Twitsave", e);
        }

        // Fallback 2: SSS Twitter
        try {
          const sssTwitRes = await fetch(`https://ssstwitter.com/api/v1/download?url=${encodeURIComponent(url)}`);
          if (sssTwitRes.ok) {
            const sssTwitData = await sssTwitRes.json();
            if (sssTwitData.status === 'success' && sssTwitData.data && sssTwitData.data.length > 0) {
              return res.json({ status: 'stream', url: sssTwitData.data[0].url, filename: "twitter_video.mp4" });
            }
          }
        } catch (e: any) {
          logError("SSSTwitter", e);
        }
      }

      // --- FACEBOOK DOWNLOADER ---
      if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
        try {
          const fbRes = await fetch("https://fdown.net/download.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENTS[0] },
            body: `URLz=${encodeURIComponent(url)}`
          });
          if (fbRes.ok) {
            const html = await fbRes.text();
            const hdMatch = html.match(/href=["']([^"']+)["'][^>]*id=["']hdlink["']/i);
            const sdMatch = html.match(/href=["']([^"']+)["'][^>]*id=["']sdlink["']/i);
            const dlUrl = (hdMatch && hdMatch[1]) || (sdMatch && sdMatch[1]);
            if (dlUrl) {
              return res.json({ status: 'stream', url: dlUrl, filename: 'facebook_video.mp4' });
            } else {
              logError("FDown", "No download link found in HTML");
            }
          } else {
            logError("FDown", `HTTP ${fbRes.status}`);
          }
        } catch (e: any) {
          logError("FDown", e);
        }
      }

      // --- UNIVERSAL FALLBACK: YT-DLP ---
      try {
        console.log(`Trying yt-dlp universal fallback for: ${url}`);
        const youtubedl = (await import('youtube-dl-exec')).default;
        const output = await youtubedl(url, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true
        });
        
        if (output && output.url) {
          return res.json({
            status: 'stream',
            url: output.url,
            filename: `${output.title || 'video'}.mp4`,
            thumbnail: output.thumbnail || ''
          });
        }
      } catch (e: any) {
        logError("yt-dlp", e);
      }

      // --- UNIVERSAL FALLBACK: VEVIOZ (Uses yt-dlp logic) ---
      try {
        console.log(`Trying Vevioz universal fallback for: ${url}`);
        const veviozRes = await fetch(`https://api.vevioz.com/api/button/videos/${encodeURIComponent(url)}`);
        if (veviozRes.ok) {
          const veviozHtml = await veviozRes.text();
          const downloadUrlMatch = veviozHtml.match(/href=["']([^"']+)["'][^>]*class=["'][^"']*download-button[^"']*["']/i) ||
                                   veviozHtml.match(/href=["']([^"']+)["'][^>]*download/i);
          if (downloadUrlMatch && downloadUrlMatch[1]) {
            return res.json({
              status: 'stream',
              url: downloadUrlMatch[1],
              filename: 'video.mp4'
            });
          }
        }
      } catch (e: any) {
        logError("Vevioz Universal", e);
      }

      // --- UNIVERSAL FALLBACK: DDOWNR ---
      try {
        console.log(`Trying Ddownr fallback for: ${url}`);
        const ddownrRes = await fetch(`https://api.ddownr.com/v1/download?url=${encodeURIComponent(url)}&format=mp4`);
        if (ddownrRes.ok) {
          const ddownrData = await ddownrRes.json();
          if (ddownrData.url) {
            return res.json({ status: 'stream', url: ddownrData.url, filename: 'video.mp4' });
          }
        }
      } catch (e: any) {
        logError("Ddownr", e);
      }

      // --- UNIVERSAL FALLBACK: SNAPANY ---
      try {
        console.log(`Trying SnapAny fallback for: ${url}`);
        const snapAnyRes = await fetch(`https://api.snapany.com/api/v1/download?url=${encodeURIComponent(url)}`);
        if (snapAnyRes.ok) {
          const snapAnyData = await snapAnyRes.json();
          if (snapAnyData.status === 'success' && snapAnyData.data && snapAnyData.data.length > 0) {
            return res.json({ status: 'stream', url: snapAnyData.data[0].url, filename: 'video.mp4' });
          }
        }
      } catch (e: any) {
        logError("SnapAny", e);
      }

      // --- GENERIC META SCRAPER ---
      try {
        const metaRes = await fetch(url, {
          headers: { 'User-Agent': USER_AGENTS[0], 'Accept': 'text/html' }
        });
        if (metaRes.ok) {
          const html = await metaRes.text();
          const ogVideoMatch = html.match(/<meta[^>]+property=["']og:video:secure_url["'][^>]+content=["']([^"']+)["']/i) ||
                               html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video:secure_url["']/i) ||
                               html.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i) ||
                               html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video["']/i);
          
          if (ogVideoMatch && ogVideoMatch[1]) {
            const videoUrl = ogVideoMatch[1].replace(/&amp;/g, '&');
            if (videoUrl.startsWith('http')) {
              return res.json({ status: 'stream', url: videoUrl, filename: 'video.mp4' });
            }
          }
        }
      } catch (e: any) {
        logError("Meta Scraper", e);
      }

      res.status(500).json({ 
        status: "error", 
        text: `The download service is currently unavailable for this specific URL. Please try a different link or platform.\n\nDebug Info:\n${debugErrors.join('\n')}` 
      });

    } catch (error: any) {
      console.error("Global download error:", error);
      res.status(500).json({ status: "error", text: `An unexpected error occurred while processing the download.\n\nError: ${error.message}` });
    }
  });

  // Proxy for actual file download to force "Save As"
  app.get("/api/proxy-file", async (req, res) => {
    const fileUrl = req.query.url as string;
    const filename = (req.query.filename as string) || "video.mp4";

    if (!fileUrl || !fileUrl.startsWith("http")) {
      return res.status(400).send("Valid URL is required");
    }

    try {
      console.log(`Proxying file download: ${fileUrl}`);
      const response = await fetch(fileUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': USER_AGENTS[0]
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch file from ${fileUrl}: ${response.status} ${response.statusText}`);
        if (!res.headersSent) {
          return res.status(response.status).send(`Failed to fetch file: ${response.statusText}`);
        }
        return;
      }

      if (res.headersSent) return;

      // Forward headers
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      const contentType = response.headers.get("Content-Type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      
      const contentLength = response.headers.get("Content-Length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      // Stream the response body
      if (response.body) {
        // Simple iteration for compatibility:
        const nodeStream = (response.body as any);
        if (nodeStream.pipe) {
          nodeStream.pipe(res);
        } else {
          // Fallback for web-style streams in Node
          const reader = response.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
          } finally {
            reader.releaseLock();
          }
          res.end();
        }
      } else {
        res.status(500).send("No response body");
      }
    } catch (error: any) {
      console.error("File proxy error:", error);
      res.status(500).send(`Failed to download file: ${error.message}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
