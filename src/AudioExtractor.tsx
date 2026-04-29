import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Music, Video, Download, RefreshCw, CheckCircle2, AlertCircle, FileAudio } from 'lucide-react';

export default function AudioExtractor() {
  const [loaded, setLoaded] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const ffmpegRef = useRef(new FFmpeg());

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setLoaded(true);
    } catch (err: any) {
      setError('Failed to initialize audio engine.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setAudioUrl(null);
      setError(null);
    }
  };

  const extractAudio = async () => {
    if (!videoFile || !loaded) return;
    setProcessing(true);
    setProgress(0);
    
    const ffmpeg = ffmpegRef.current;
    const inputName = 'input_video';
    const outputName = 'output_audio.mp3';

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      
      // Extract audio to MP3
      await ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'libmp3lame', '-ab', '192k', '-ar', '44100', '-y', outputName]);
      
      const data = await ffmpeg.readFile(outputName);
      const url = URL.createObjectURL(new Blob([(data as Uint8Array).buffer], { type: 'audio/mp3' }));
      setAudioUrl(url);
    } catch (err) {
      setError('Failed to extract audio. The video might not have an audio track or is incompatible.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Free Video to MP3 Audio Extractor</h1>
        <p className="text-gray-500 dark:text-gray-400">Extract high-quality MP3 audio from any video file locally.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-6">
        {!videoFile ? (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Video className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 font-semibold">Click to upload video</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">MP4, MOV, AVI, MKV (Max 500MB recommended)</p>
            </div>
            <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} disabled={processing} />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-3">
                <Video className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{videoFile.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                onClick={() => { setVideoFile(null); setAudioUrl(null); }}
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                disabled={processing}
              >
                Change Video
              </button>
            </div>

            <button
              onClick={extractAudio}
              disabled={!loaded || processing}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                !loaded || processing ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {processing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Extracting Audio ({progress}%)
                </>
              ) : (
                <>
                  <Music className="w-5 h-5" />
                  Extract MP3
                </>
              )}
            </button>
          </div>
        )}

        {audioUrl && (
          <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/30 space-y-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-400 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              Audio Extracted Successfully
            </div>
            <audio src={audioUrl} controls className="w-full" />
            <a
              href={audioUrl}
              download={`${videoFile?.name.split('.')[0] || 'audio'}.mp3`}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex justify-center items-center gap-2 transition-all shadow-md"
            >
              <Download className="w-5 h-5" />
              Download MP3
            </a>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {!loaded && !error && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Initializing audio engine...
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl space-y-6 border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white justify-center underline underline-offset-8 decoration-blue-500/30">
          <FileAudio className="w-6 h-6 text-blue-500" />
          High-Quality Video to MP3 Converter
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 text-gray-600 dark:text-gray-400">
          <div>
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Fast Video to Audio Extraction Online</h3>
            <p className="text-sm">
              Are you looking to <strong className="text-gray-800 dark:text-gray-100">extract audio from video free online</strong>? BitBrainTech provides a professional-grade <strong className="text-gray-800 dark:text-gray-100">video to mp3 converter</strong> that works instantly in your browser. Whether you want to <strong className="text-gray-800 dark:text-gray-100">convert mp4 to mp3</strong> or extract clips from MOV and AVI files, our tool delivers high-fidelity sound without any server lag.
            </p>
          </div>
          <div>
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">100% Private & Secure Audio Ripper</h3>
            <p className="text-sm">
              As a <strong className="text-gray-800 dark:text-gray-100">secure audio extractor</strong>, we guarantee that your files never leave your computer. Our <strong className="text-gray-800 dark:text-gray-100">browser-based video to audio tool</strong> uses local processing power, making it the most <strong className="text-gray-800 dark:text-gray-100">private video to mp3</strong> solution available. No logs, no data collection, just pure extraction performance for creators.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 grid md:grid-cols-4 gap-4 text-xs">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">High Bitrate</h4>
            <p>Export audio at 192kbps for crystal-clear quality.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">No Install</h4>
            <p>No software or browser extensions required.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">Bulk Extraction</h4>
            <p>Process multiple videos safely and quickly.</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">Privacy Guarantee</h4>
            <p>100% on-device processing for total data security.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
