import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const HowItWorks = lazy(() => import('./HowItWorks'));
const PrivacyPolicy = lazy(() => import('./PrivacyPolicy'));
const QrGenerator = lazy(() => import('./QrGenerator'));
const OcrExtractor = lazy(() => import('./OcrExtractor'));
const ImageUpscaler = lazy(() => import('./ImageUpscaler'));
const ImageConverter = lazy(() => import('./ImageConverter'));
const PdfTools = lazy(() => import('./PdfTools'));
const AudioExtractor = lazy(() => import('./AudioExtractor'));
import ImageBackgroundRemover from './components/ImageBackgroundRemover';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import workerURL from '@ffmpeg/ffmpeg/worker?url';
import { 
  Upload, 
  Video, 
  Settings, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Terminal,
  Wand2,
  Menu,
  X,
  Youtube,
  Smartphone,
  Facebook,
  Image as ImageIcon
} from 'lucide-react';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface ProcessingOptions {
  mirror: boolean;
  speed: number;
  pitch: number;
  addBorder: boolean;
  colorFilter: 'none' | 'vibrant' | 'sepia' | 'grayscale';
  noise: boolean;
}

export default function App() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [isFfmpegLoading, setIsFfmpegLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Dynamic SEO Meta Tags
  const path = location.pathname;
  let pageKey = 'home';
  if (path === '/how-it-works') pageKey = 'how-it-works';
  else if (path === '/privacy') pageKey = 'privacy';
  else if (path === '/qr-generator') pageKey = 'qr-generator';
  else if (path === '/image-to-text') pageKey = 'ocr';
  else if (path === '/image-upscaler') pageKey = 'upscaler';
  else if (path === '/image-converter') pageKey = 'converter';
  else if (path === '/pdf-tools') pageKey = 'pdf';
  else if (path === '/audio-extractor') pageKey = 'audio';
  else if (path === '/bg-remover') pageKey = 'bg-remover';
  else if (path === '/video-editor') pageKey = 'video-editor';

  const seoData: Record<string, {title: string, description: string, url: string}> = {
    'home': {
      title: 'AI Background Remover Pro | Free Online Background Removal',
      description: 'Remove image backgrounds instantly with professional AI precision. Features manual mask refinement, zoom, pan, and 100% privacy. No upload required, runs in your browser.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/'
    },
    'video-editor': {
      title: 'Free Video Metadata Editor | Bypass Copyright YouTube & TikTok',
      description: 'Use our free video uniqueifier to alter digital footprints, change MD5 hash, and remove metadata. Bypass automated copyright detection on YouTube and TikTok securely.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/video-editor'
    },
    'how-it-works': {
      title: 'How It Works | Secure Local Video & Image Processing',
      description: 'Discover how BitBrainTech uses WebAssembly for 100% private video editing and image processing. No server uploads, total data security.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/how-it-works'
    },
    'privacy': {
      title: 'Privacy Policy | 100% Private Video & Image Tools',
      description: 'Your privacy is our priority. BitBrainTech processes all files locally in your browser. No tracking, no server uploads, no data collection.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/privacy'
    },
    'qr-generator': {
      title: 'Free QR Code Generator | Custom Barcode Maker Online',
      description: 'Create custom QR codes and barcodes instantly. Privacy-first, offline generation with no tracking. Download high-res PNG codes for free.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/qr-generator'
    },
    'ocr': {
      title: 'Image to Text Converter | Free Online OCR Tool',
      description: 'Extract text from images and handwriting with our highly accurate OCR tool. Supports 10+ languages. Secure, fast, and free picture to text scanner.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/image-to-text'
    },
    'upscaler': {
      title: 'AI Image Upscaler | Enhance Resolution Online Free',
      description: 'Upscale images up to 8x without losing quality. Our AI image upscaler enhances resolution locally in your browser. Fix blurry photos for free.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/image-upscaler'
    },
    'converter': {
      title: 'Free Image Converter Online | JPG, PNG, WEBP, GIF',
      description: 'Convert images between JPG, PNG, WEBP, and GIF formats instantly. Secure batch image converter with quality control. 100% private and local.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/image-converter'
    },
    'pdf': {
      title: 'Free PDF Toolkit | Merge, Split & Image to PDF Online',
      description: 'Securely merge multiple PDFs, split pages, or convert images to PDF locally in your browser. 100% private PDF editor with no server uploads.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/pdf-tools'
    },
    'audio': {
      title: 'Extract Audio from Video | Free Video to MP3 Converter',
      description: 'Extract high-quality MP3 audio from any video file instantly. Secure, browser-based video to audio converter. No software or registration required.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/audio-extractor'
    },
    'bg-remover': {
      title: 'Free AI Background Remover | Remove Image Background Online',
      description: 'Remove backgrounds from images instantly using on-device AI. 100% private, secure, and free. No server uploads, total data security.',
      url: 'https://ais-dev-uwk6wtikhw7u7nr2g32qqv-573475868306.run.app/'
    }
  };

  const currentSeo = seoData[pageKey] || seoData['home'];

  const [options, setOptions] = useState<ProcessingOptions>({
    mirror: true,
    speed: 1.05,
    pitch: 1.0,
    addBorder: true,
    colorFilter: 'vibrant',
    noise: false,
  });

  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // FFmpeg is now loaded on demand in processVideo
  }, []);

  useEffect(() => {
    if (logsEndRef.current && logsEndRef.current.parentElement) {
      logsEndRef.current.parentElement.scrollTop = logsEndRef.current.parentElement.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-19), msg]);
  };

  const loadFfmpeg = async (): Promise<boolean> => {
    const ffmpeg = ffmpegRef.current;
    
    ffmpeg.on('log', ({ message }) => {
      addLog(message);
    });

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });

    setIsFfmpegLoading(true);
    try {
      const isDev = import.meta.env.MODE === 'development';
      
      const loadWithCache = async (url: string) => {
        const cache = await caches.open('ffmpeg-cache-v1');
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
          return URL.createObjectURL(await cachedResponse.blob());
        }
        
        const response = await fetch(url);
        const blob = await response.blob();
        await cache.put(url, new Response(blob));
        return URL.createObjectURL(blob);
      };

      const [coreBlob, wasmBlob, workerBlob] = await Promise.all([
        isDev ? coreURL : loadWithCache(coreURL),
        isDev ? wasmURL : loadWithCache(wasmURL),
        isDev ? workerURL : loadWithCache(workerURL),
      ]);

      await ffmpeg.load({
        coreURL: coreBlob,
        wasmURL: wasmBlob,
        workerURL: workerBlob,
      });
      
      setFfmpegLoaded(true);
      setIsFfmpegLoading(false);
      return true;
    } catch (err: any) {
      setIsFfmpegLoading(false);
      console.error('CRITICAL: FFmpeg initialization failed:', err);
      const errorMessage = err.message || 'Unknown error';
      setError(`FFmpeg initialization failed: ${errorMessage}`);
      addLog(`ERROR: Engine initialization failed: ${errorMessage}`);
      // Log stack trace if available
      if (err.stack) {
        console.error('Stack trace:', err.stack);
        addLog(`Stack: ${err.stack.substring(0, 100)}...`);
      }
      return false;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setOutputUrl(null);
      setError(null);
      setLogs([]);
      addLog(`Loaded file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    }
  };

  const processVideo = async () => {
    if (!videoFile) return;
    
    // Check if engine is ready
    if (!ffmpegLoaded) {
      setProcessing(true);
      addLog('Initializing engine...');
      const isReady = await loadFfmpeg();
      if (!isReady) {
        setProcessing(false);
        setError('Failed to initialize engine.');
        return;
      }
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    addLog('Starting transformation sequence...');

    const ffmpeg = ffmpegRef.current;
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    
    let isAv1Error = false;
    const logCallback = ({ message }: { message: string }) => {
      if (message.toLowerCase().includes('av1') && 
         (message.includes('Function not implemented') || message.includes('hardware accelerated AV1 decoding'))) {
        isAv1Error = true;
      }
    };
    
    ffmpeg.on('log', logCallback);

    try {
      addLog('Writing file to virtual filesystem...');
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Build FFmpeg command
      const filters = [];
      
      // Video filters
      const vFilters = [];
      if (options.mirror) {
        vFilters.push('hflip');
        addLog('Applying horizontal flip...');
      }
      
      // Speed adjustment (setpts)
      if (options.speed !== 1) {
        vFilters.push(`setpts=${(1/options.speed).toFixed(4)}*PTS`);
        addLog(`Adjusting video speed to ${options.speed}x...`);
      }

      // Color filters
      if (options.colorFilter === 'vibrant') {
        vFilters.push('eq=saturation=1.3:contrast=1.1:brightness=0.02');
        addLog('Applying vibrant color grading...');
      } else if (options.colorFilter === 'sepia') {
        vFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
        addLog('Applying sepia filter...');
      } else if (options.colorFilter === 'grayscale') {
        vFilters.push('hue=s=0');
        addLog('Applying grayscale filter...');
      }

      // Add border
      if (options.addBorder) {
        vFilters.push('pad=iw+20:ih+20:10:10:black');
        addLog('Adding safety border...');
      }

      // Ensure even dimensions for x264 encoder compatibility
      vFilters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');

      // Audio filters
      const aFilters = [];
      if (options.speed !== 1) {
        aFilters.push(`atempo=${options.speed.toFixed(4)}`);
        addLog(`Adjusting audio tempo to ${options.speed}x...`);
      }
      
      // Pitch shift
      if (options.pitch !== 1) {
        const sampleRate = 44100;
        const newRate = Math.round(sampleRate * options.pitch);
        aFilters.push(`asetrate=${newRate},atempo=${(1/options.pitch).toFixed(4)}`);
        addLog(`Shifting audio pitch to ${options.pitch}x...`);
      }

      const args = ['-i', inputName];
      
      if (vFilters.length > 0) {
        args.push('-vf', vFilters.join(','));
      }
      
      if (aFilters.length > 0) {
        args.push('-af', aFilters.join(','));
      }

      args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-y', outputName);

      addLog(`Executing FFmpeg command: ffmpeg ${args.join(' ')}`);
      let ret = await ffmpeg.exec(args);

      if (ret !== 0) {
        if (isAv1Error) {
          throw new Error('AV1_UNSUPPORTED');
        }
        
        addLog('Command failed. Retrying without audio filters (in case video has no audio track)...');
        const fallbackArgs = ['-i', inputName];
        if (vFilters.length > 0) {
          fallbackArgs.push('-vf', vFilters.join(','));
        }
        fallbackArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-y', outputName);
        ret = await ffmpeg.exec(fallbackArgs);
        
        if (ret !== 0) {
          if (isAv1Error) throw new Error('AV1_UNSUPPORTED');
          throw new Error(`FFmpeg exec failed with code ${ret}`);
        }
      }

      addLog('Reading output file...');
      const data = await ffmpeg.readFile(outputName);
      const url = URL.createObjectURL(new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' }));
      setOutputUrl(url);
      addLog('Transformation complete. Ready for download.');
    } catch (err: any) {
      console.error('Processing error:', err);
      if (err.message === 'AV1_UNSUPPORTED' || isAv1Error) {
        setError('Your video uses the AV1 codec, which is not supported by the browser engine. Please convert it to a standard MP4 (H.264) file first.');
        addLog('ERROR: Unsupported AV1 codec detected.');
      } else {
        setError('An error occurred during video processing. The file might be too large or incompatible.');
        addLog('ERROR: Transformation failed.');
      }
    } finally {
      ffmpeg.off('log', logCallback);
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <Helmet>
        <title>{currentSeo.title}</title>
        <meta name="title" content={currentSeo.title} />
        <meta name="description" content={currentSeo.description} />
        
        <meta property="og:url" content={currentSeo.url} />
        <meta property="og:title" content={currentSeo.title} />
        <meta property="og:description" content={currentSeo.description} />
        
        <meta property="twitter:url" content={currentSeo.url} />
        <meta property="twitter:title" content={currentSeo.title} />
        <meta property="twitter:description" content={currentSeo.description} />
        
        <link rel="canonical" href={currentSeo.url} />
      </Helmet>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                BitBrainTech
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center bg-gray-50/50 p-1 rounded-xl border border-gray-100">
              <Link 
                to="/" 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
              >
                BG Remover
              </Link>
              <Link 
                to="/video-editor" 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/video-editor' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
              >
                Video Editor
              </Link>
              
              <div className="w-px h-4 bg-gray-200 mx-1" />
              
              {/* Dropdown for More Tools */}
              <div className="relative group/menu">
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50 flex items-center gap-1">
                  More Tools
                  <Menu className="w-4 h-4" />
                </button>
                <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all transform origin-top-right scale-95 group-hover/menu:scale-100 p-1.5">
                  <Link to="/qr-generator" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    QR Generator
                  </Link>
                  <Link to="/image-to-text" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    Image to Text
                  </Link>
                  <Link to="/image-upscaler" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    Image Upscaler
                  </Link>
                  <Link to="/image-converter" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    Image Converter
                  </Link>
                  <Link to="/pdf-tools" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    PDF Tools
                  </Link>
                  <Link to="/audio-extractor" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    Audio Extractor
                  </Link>
                </div>
              </div>
            </nav>

            <div className="flex items-center gap-3">
              {/* Engine Status */}
              <div className="hidden md:block">
                {ffmpegLoaded ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Engine Ready
                  </div>
                ) : isFfmpegLoading ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 text-xs font-semibold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Initializing...
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100 text-xs font-medium">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Standby
                  </div>
                )}
              </div>
              
              <button 
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-2 text-sm font-medium text-gray-600 shadow-xl absolute w-full left-0">
            <Link 
              to="/" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`text-left transition-colors px-4 py-3 rounded-xl ${location.pathname === '/' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 hover:text-gray-900'}`}
            >
              BG Remover
            </Link>
            <Link 
              to="/video-editor" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`text-left transition-colors px-4 py-3 rounded-xl ${location.pathname === '/video-editor' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 hover:text-gray-900'}`}
            >
              Video Editor
            </Link>
            <Link 
              to="/qr-generator" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`text-left transition-colors px-4 py-3 rounded-xl ${location.pathname === '/qr-generator' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 hover:text-gray-900'}`}
            >
              QR Generator
            </Link>
            <Link 
              to="/image-to-text" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`text-left transition-colors px-4 py-3 rounded-xl ${location.pathname === '/image-to-text' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 hover:text-gray-900'}`}
            >
              Image to Text
            </Link>
            <Link 
              to="/image-upscaler" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`text-left transition-colors px-4 py-3 rounded-xl ${location.pathname === '/image-upscaler' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 hover:text-gray-900'}`}
            >
              Image Upscaler
            </Link>
            <Link 
              to="/image-converter" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`text-left transition-colors px-4 py-3 rounded-xl ${location.pathname === '/image-converter' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 hover:text-gray-900'}`}
            >
              Image Converter
            </Link>
            <Link 
              to="/pdf-tools" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`text-left transition-colors px-4 py-3 rounded-xl ${location.pathname === '/pdf-tools' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 hover:text-gray-900'}`}
            >
              PDF Tools
            </Link>
            <Link 
              to="/audio-extractor" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className={`text-left transition-colors px-4 py-3 rounded-xl ${location.pathname === '/audio-extractor' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 hover:text-gray-900'}`}
            >
              Audio Extractor
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<ImageBackgroundRemover />} />
          <Route path="/video-editor" element={
            <>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column: Upload & Preview */}
              <div className="space-y-6">
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-gray-500" /> Video Input
              </h2>
              
              {!videoFile ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500">MP4, MOV, AVI (Max 500MB recommended)</p>
                  </div>
                  <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} disabled={processing} />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                    <video 
                      ref={videoRef}
                      src={URL.createObjectURL(videoFile)} 
                      className="w-full h-full object-contain"
                      controls
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={videoFile.name}>
                      {videoFile.name}
                    </span>
                    <button 
                      onClick={() => { setVideoFile(null); setOutputUrl(null); }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                      disabled={processing}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Terminal Logs */}
            <section className="bg-gray-900 rounded-xl shadow-sm overflow-hidden border border-gray-800 flex flex-col h-64">
              <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
                <Terminal className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-mono text-gray-300">Processing Logs</span>
              </div>
              <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-green-400 space-y-1">
                {logs.length === 0 ? (
                  <span className="text-gray-500">Waiting for operations...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="break-all">{log}</div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </section>
          </div>

          {/* Right Column: Options & Output */}
          <div className="space-y-6">
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" /> Transformation Settings
              </h2>
              
              <div className="space-y-5">
                {/* Toggles */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900">Mirror Video</label>
                    <p className="text-xs text-gray-500">Flips the video horizontally</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={options.mirror}
                    onChange={(e) => setOptions({...options, mirror: e.target.checked})}
                    disabled={processing}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900">Safety Border</label>
                    <p className="text-xs text-gray-500">Adds a slight black border</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={options.addBorder}
                    onChange={(e) => setOptions({...options, addBorder: e.target.checked})}
                    disabled={processing}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </div>

                <hr className="border-gray-100" />

                {/* Sliders */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-medium text-gray-900">Playback Speed</label>
                    <span className="text-sm text-gray-500">{options.speed.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.8" max="1.2" step="0.01"
                    value={options.speed}
                    onChange={(e) => setOptions({...options, speed: parseFloat(e.target.value)})}
                    disabled={processing}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-medium text-gray-900">Audio Pitch</label>
                    <span className="text-sm text-gray-500">{options.pitch.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.8" max="1.2" step="0.01"
                    value={options.pitch}
                    onChange={(e) => setOptions({...options, pitch: parseFloat(e.target.value)})}
                    disabled={processing}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <hr className="border-gray-100" />

                {/* Select */}
                <div>
                  <label className="block font-medium text-gray-900 mb-1">Color Filter</label>
                  <select 
                    value={options.colorFilter}
                    onChange={(e) => setOptions({...options, colorFilter: e.target.value as any})}
                    disabled={processing}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                  >
                    <option value="none">None (Original)</option>
                    <option value="vibrant">Vibrant (High Saturation)</option>
                    <option value="sepia">Sepia (Warm Vintage)</option>
                    <option value="grayscale">Grayscale (Black & White)</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8">
                <button
                  onClick={processVideo}
                  disabled={!videoFile || processing}
                  className={cn(
                    "w-full py-3 px-4 rounded-lg font-medium text-white flex justify-center items-center gap-2 transition-all",
                    (!videoFile || processing) 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
                  )}
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Processing ({progress}%)
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Start Transformation
                    </>
                  )}
                </button>
                
                {error && (
                  <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2 border border-red-200">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Output Section */}
            {outputUrl && (
              <section className="bg-white p-6 rounded-xl shadow-sm border border-green-200 bg-green-50/30">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="w-5 h-5" /> Transformation Complete
                </h2>
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative mb-4">
                  <video 
                    src={outputUrl} 
                    className="w-full h-full object-contain"
                    controls
                  />
                </div>
                <a
                  href={outputUrl}
                  download="copyright_shield_output.mp4"
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex justify-center items-center gap-2 transition-all shadow-md hover:shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Download Safe Video
                </a>
              </section>
            )}
          </div>
        </div>

        {/* Optimized SEO Content Block for Home Page */}
        <div className="mt-12 bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-gray-600 leading-relaxed">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Advanced Video Metadata & Digital Footprint Editor</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-md font-semibold text-gray-800 mb-2">Bypass Automated Copyright Detection</h3>
              <p className="text-sm mb-4">
                Are you looking for a way to <strong className="text-gray-800">bypass copyright on YouTube</strong> or <strong className="text-gray-800">avoid copyright strikes on TikTok</strong>? BitBrainTech is a specialized <strong className="text-gray-800">video uniqueifier</strong> that uses advanced browser-based processing to <strong className="text-gray-800">alter video digital footprints</strong>. By applying subtle transformations like mirroring, speed adjustment, and color grading, our tool ensures your content is perceived as unique by automated Content ID systems.
              </p>
            </div>
            <div>
              <h3 className="text-md font-semibold text-gray-800 mb-2">Secure Video Metadata Scrubber</h3>
              <p className="text-sm mb-4">
                Our <strong className="text-gray-800">free video metadata editor</strong> allows you to completely <strong className="text-gray-800">remove video metadata</strong> and <strong className="text-gray-800">change video MD5 hash</strong> values instantly. As a <strong className="text-gray-800">secure video editor</strong>, all processing happens locally in your browser using WebAssembly. This means your files are never uploaded to a server, providing <strong className="text-gray-800">100% private video editing</strong> with no data leaks.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-md font-semibold text-gray-800 mb-2">Why Use Our Video Footprint Editor?</h3>
            <p className="text-sm">
              Whether you need to <strong className="text-gray-800">scrub video metadata online</strong> or require a <strong className="text-gray-800">no watermark video editor free</strong> of charge, BitBrainTech provides a professional-grade toolkit. It's the perfect solution for creators who need to repurpose content while maintaining original quality and ensuring privacy. Our <strong className="text-gray-800">video unique hash generator</strong> is fast, reliable, and completely free to use.
            </p>
          </div>
        </div>
        </>
          } />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/qr-generator" element={<QrGenerator />} />
          <Route path="/image-to-text" element={<OcrExtractor />} />
          <Route path="/image-upscaler" element={<ImageUpscaler />} />
          <Route path="/image-converter" element={<ImageConverter />} />
          <Route path="/pdf-tools" element={<PdfTools />} />
          <Route path="/audio-extractor" element={<AudioExtractor />} />
          <Route path="/bg-remover" element={<Link to="/" className="text-blue-600 underline">Go to Home</Link>} />
        </Routes>
      </main>

      {/* Global Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col items-center gap-4">
          <div className="flex gap-6 text-sm font-medium text-gray-600">
            <Link 
              to="/" 
              className={`transition-colors ${location.pathname === '/' ? 'text-blue-600' : 'hover:text-blue-600'}`}
            >
              Home
            </Link>
            <Link 
              to="/how-it-works" 
              className={`transition-colors ${location.pathname === '/how-it-works' ? 'text-blue-600' : 'hover:text-blue-600'}`}
            >
              How it Works
            </Link>
            <Link 
              to="/privacy" 
              className={`transition-colors ${location.pathname === '/privacy' ? 'text-blue-600' : 'hover:text-blue-600'}`}
            >
              Privacy Policy
            </Link>
            <a 
              href="https://www.facebook.com/bitbraintechns" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-blue-600"
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </a>
          </div>
          <p className="text-xs text-gray-500 text-center max-w-2xl">
            <strong>Disclaimer:</strong> BitBrainTech provides tools for personal, educational, and fair-use purposes only. Users are solely responsible for ensuring they have the right to download, modify, or process any media. We do not host or store user files on our servers.
          </p>
        </div>
      </footer>
    </div>
  );
}
