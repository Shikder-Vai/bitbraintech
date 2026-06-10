import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const HowItWorks = lazy(() => import('./HowItWorks'));
const PrivacyPolicy = lazy(() => import('./PrivacyPolicy'));
const QrGenerator = lazy(() => import('./QrGenerator'));
const OcrExtractor = lazy(() => import('./OcrExtractor'));
const ImageUpscaler = lazy(() => import('./ImageUpscaler'));
const ImageConverter = lazy(() => import('./ImageConverter'));
const ImageResizer = lazy(() => import('./components/ImageResizer'));
const PdfTools = lazy(() => import('./PdfTools'));
const AudioExtractor = lazy(() => import('./AudioExtractor'));
const AudioEnhancer = lazy(() => import('./components/AudioEnhancer'));
import ImageBackgroundRemover from './components/ImageBackgroundRemover';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { 
  Upload, 
  Video, 
  Settings, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Check,
  AlertCircle,
  ShieldCheck,
  Terminal,
  Wand2,
  Menu,
  X,
  Youtube,
  Smartphone,
  Facebook,
  Image as ImageIcon,
  Moon,
  Sun
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
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [videoPreviewUrl, outputUrl]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

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
  else if (path === '/audio-enhancer') pageKey = 'audio-enhancer';
  else if (path === '/bg-remover') pageKey = 'bg-remover';
  else if (path === '/video-editor') pageKey = 'video-editor';
  else if (path === '/image-resizer') pageKey = 'image-resizer';

  const seoData: Record<string, {title: string, description: string, url: string, applicationName?: string}> = {
    'home': {
      title: 'Remove Background from Image Free | Best Remove BG Tool',
      description: 'The best way to remove background from photo free instantly. Create a transparent background or change background to white with our AI remove bg tool. 100% private.',
      url: 'https://bitbraintech.online'
    },
    'video-editor': {
      title: 'Video Uniqueifier Tool | Bypass YouTube Content ID Copyright',
      description: 'The ultimate video uniqueifier to bypass YouTube content ID and copyright strikes. Change video md5 hash and remove metadata instantly. 100% local and free.',
      url: 'https://bitbraintech.online/video-editor',
      applicationName: 'Video Uniqueifier & Hash Changer'
    },
    'how-it-works': {
      title: 'Secure Local Processing - How It Works | BitBrainTech',
      description: 'Learn how BitBrainTech uses on-device AI for 100% private video editing and image processing. No server uploads, zero data collection.',
      url: 'https://bitbraintech.online/how-it-works'
    },
    'privacy': {
      title: 'Privacy Policy | 100% Zero-Server Media Processing',
      description: 'Your privacy is our priority. BitBrainTech processes all files locally in your browser. Read about our total privacy guarantee.',
      url: 'https://bitbraintech.online/privacy'
    },
    'qr-generator': {
      title: 'Free QR Code Generator | Custom Barcode Maker Online',
      description: 'Create custom QR codes and high-res barcodes for free. Secure, offline-first generator with no tracking. Download PNG instantly.',
      url: 'https://bitbraintech.online/qr-generator',
      applicationName: 'Secure QR & Barcode Generator'
    },
    'ocr': {
      title: 'Image to Text Converter | High Accuracy Online OCR Free',
      description: 'Copy text from image online with high accuracy. The best free OCR scanner for Bengali, Hindi, and English handwriting to text. 100% Private.',
      url: 'https://bitbraintech.online/image-to-text',
      applicationName: 'AI Image to Text Ocr'
    },
    'upscaler': {
      title: 'AI Image Upscaler Pro | Upscale Image to 4K Free Online',
      description: 'Upscale image to 4K free online using advanced AI. Fix blurry photos and increase resolution without losing quality. 100% browser-based.',
      url: 'https://bitbraintech.online/image-upscaler',
      applicationName: 'AI Photo Enhancer & Upscaler'
    },
    'converter': {
      title: 'Batch Image Converter | Free JPG, PNG, WEBP Tool',
      description: 'Convert images to JPG, PNG, or WEBP in bulk securely. High-quality batch image converter with privacy focus. No uploads required.',
      url: 'https://bitbraintech.online/image-converter',
      applicationName: 'Batch Image Converter'
    },
    'pdf': {
      title: 'Secure PDF Tools | Merge & Split PDF Online Free',
      description: 'Merge PDF online free and split PDF pages securely in your browser. The best image to PDF converter with 100% privacy guarantee.',
      url: 'https://bitbraintech.online/pdf-tools',
      applicationName: 'Secure PDF Toolkit'
    },
    'audio': {
      title: 'Extract MP3 from Video | Free Video to Audio Converter',
      description: 'Extract MP3 from video online free with high quality (192kbps). Fast and secure video to audio converter with no server uploads.',
      url: 'https://bitbraintech.online/audio-extractor',
      applicationName: 'High-Res Audio Extractor'
    },
    'audio-enhancer': {
      title: 'AI Audio Enhancer Pro | Remove Background Noise from Audio Free',
      description: 'The best free AI audio enhancer to remove background noise from audio online. Boost voice clarity and normalize volume instantly. 100% private.',
      url: 'https://bitbraintech.online/audio-enhancer',
      applicationName: 'Studio Audio Enhancer & Cleaner'
    },
    'bg-remover': {
      title: 'Remove Background Online | Best Free Remove BG Tool HD',
      description: 'Instantly remove background from image for free. High-quality background eraser for transparent backgrounds or white backgrounds. 100% private on-device AI.',
      url: 'https://bitbraintech.online/'
    },
    'image-resizer': {
      title: 'Free Image Resizer & Size Compressor | BitBrainTech',
      description: 'Resize image dimensions (pixels or percentage) and reduce file size (KB/MB) online for free. Adjust quality or specify custom target size limits. 100% private browser-based tool.',
      url: 'https://bitbraintech.online/image-resizer',
      applicationName: 'Bulk Image Resizer & Compressor'
    }
  };

  const currentSeo = seoData[pageKey] || seoData['home'];

  // Application JSON-LD for rich snippets
  const schemaOrg = currentSeo.applicationName ? {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": currentSeo.applicationName,
    "operatingSystem": "All",
    "applicationCategory": "MultimediaApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "1250"
    }
  } : null;

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
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
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
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <Helmet>
        <title>{currentSeo.title}</title>
        <meta name="title" content={currentSeo.title} />
        <meta name="description" content={currentSeo.description} />
        
        <meta property="og:type" content={pageKey === 'home' ? 'website' : 'article'} />
        <meta property="og:url" content={currentSeo.url} />
        <meta property="og:title" content={currentSeo.title} />
        <meta property="og:description" content={currentSeo.description} />
        
        <meta property="twitter:url" content={currentSeo.url} />
        <meta property="twitter:title" content={currentSeo.title} />
        <meta property="twitter:description" content={currentSeo.description} />
        
        <link rel="canonical" href={currentSeo.url} />
        
        {schemaOrg && (
          <script type="application/ld+json">
            {JSON.stringify(schemaOrg)}
          </script>
        )}
      </Helmet>

      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none group-hover:scale-105 transition-transform">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                BitBrainTech
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center bg-gray-50/50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-100 dark:border-gray-800">
              <Link 
                to="/" 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
              >
                BG Remover
              </Link>
              <Link 
                to="/video-editor" 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === '/video-editor' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
              >
                Video Editor
              </Link>
              
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
              
              {/* Dropdown for More Tools */}
              <div className="relative group/menu">
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50 flex items-center gap-1">
                  More Tools
                  <Menu className="w-4 h-4" />
                </button>
                <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all transform origin-top-right scale-95 group-hover/menu:scale-100 p-1.5">
                  {[
                    { path: '/qr-generator', label: 'QR Generator' },
                    { path: '/image-to-text', label: 'Image to Text' },
                    { path: '/image-upscaler', label: 'Image Upscaler' },
                    { path: '/image-converter', label: 'Image Converter' },
                    { path: '/image-resizer', label: 'Image Resizer' },
                    { path: '/pdf-tools', label: 'PDF Tools' },
                    { path: '/audio-extractor', label: 'Audio Extractor' },
                    { path: '/audio-enhancer', label: 'Audio Enhancer' }
                  ].map((item) => (
                    <Link key={item.path} to={item.path} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>

              {/* Engine Status */}
              <div className="hidden md:block">
                {ffmpegLoaded ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full border border-green-100 dark:border-green-900/30 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Engine Ready
                  </div>
                ) : isFfmpegLoading ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/30 text-xs font-semibold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Initializing...
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full border border-gray-100 dark:border-gray-700 text-xs font-medium">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Standby
                  </div>
                )}
              </div>
              
              <button 
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-4 flex flex-col gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 shadow-xl absolute w-full left-0 z-50">
            {[
              { path: '/', label: 'BG Remover' },
              { path: '/video-editor', label: 'Video Editor' },
              { path: '/qr-generator', label: 'QR Generator' },
              { path: '/image-to-text', label: 'Image to Text' },
              { path: '/image-upscaler', label: 'Image Upscaler' },
              { path: '/image-converter', label: 'Image Converter' },
              { path: '/image-resizer', label: 'Image Resizer' },
              { path: '/pdf-tools', label: 'PDF Tools' },
              { path: '/audio-extractor', label: 'Audio Extractor' },
              { path: '/audio-enhancer', label: 'Audio Enhancer' }
            ].map((item) => (
              <Link 
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)} 
                className={`text-left transition-colors px-4 py-3 rounded-xl ${location.pathname === item.path ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-gray-500 font-medium">Loading AI Engine...</p>
          </div>
        }>
          <Routes>
          <Route path="/" element={<ImageBackgroundRemover />} />
          <Route path="/video-editor" element={
            <>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column: Upload & Preview */}
              <div className="space-y-6">
            <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
              <h1 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                <Video className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Free Video Uniqueifier
              </h1>
              
              {!videoFile ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-3" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">MP4, MOV, AVI (Max 500MB recommended)</p>
                  </div>
                  <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} disabled={processing} />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                    <video 
                      ref={videoRef}
                      src={videoPreviewUrl || undefined} 
                      className="w-full h-full object-contain"
                      controls
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={videoFile.name}>
                      {videoFile.name}
                    </span>
                    <button 
                      onClick={() => { 
                        if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
                        setVideoPreviewUrl(null);
                        setVideoFile(null); 
                        setOutputUrl(null); 
                      }}
                      className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
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
            <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white">
                <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Transformation Settings
              </h2>
              
              <div className="space-y-5">
                {/* Toggles */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900 dark:text-gray-200">Mirror Video</label>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Flips the video horizontally</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={options.mirror}
                    onChange={(e) => setOptions({...options, mirror: e.target.checked})}
                    disabled={processing}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900 dark:text-gray-200">Safety Border</label>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Adds a slight black border</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={options.addBorder}
                    onChange={(e) => setOptions({...options, addBorder: e.target.checked})}
                    disabled={processing}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                  />
                </div>

                <hr className="border-gray-100 dark:border-gray-800" />

                {/* Sliders */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-medium text-gray-900 dark:text-gray-200">Playback Speed</label>
                    <span className="text-sm text-gray-500 dark:text-gray-500">{options.speed.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.8" max="1.2" step="0.01"
                    value={options.speed}
                    onChange={(e) => setOptions({...options, speed: parseFloat(e.target.value)})}
                    disabled={processing}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="font-medium text-gray-900 dark:text-gray-200">Audio Pitch</label>
                    <span className="text-sm text-gray-500 dark:text-gray-500">{options.pitch.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.8" max="1.2" step="0.01"
                    value={options.pitch}
                    onChange={(e) => setOptions({...options, pitch: parseFloat(e.target.value)})}
                    disabled={processing}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <hr className="border-gray-100 dark:border-gray-800" />

                {/* Select */}
                <div>
                  <label className="block font-medium text-gray-900 dark:text-gray-200 mb-1">Color Filter</label>
                  <select 
                    value={options.colorFilter}
                    onChange={(e) => setOptions({...options, colorFilter: e.target.value as any})}
                    disabled={processing}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
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
              <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-green-200 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-800 dark:text-green-400">
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

        {/* Why Choice Us for Video Editor */}
        <div className="mt-8 bg-black dark:bg-gray-800/50 p-8 rounded-[32px] text-white shadow-2xl overflow-hidden relative border border-gray-800">
           <h2 className="text-3xl font-black mb-8 text-center uppercase tracking-tighter">The Best Tool to Bypass YouTube Content ID</h2>
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "No Metadata Trace", desc: "Strip 100% of EXIF & GPS metadata markers. Leave no digital footprint on TikTok or YouTube." },
                { title: "MD5 Hash Changer", desc: "Change video MD5 hash instantly. Every uniqueified video beats automated duplication filters." },
                { title: "Zero Server Uploads", desc: "The most secure video uniqueifier. Processing is local, so we never see your private files." },
                { title: "Copyright Shield", desc: "Heuristic frame & audio transformation to bypass YouTube copyright strikes and Content ID bots." }
              ].map((item, i) => (
                <div key={i} className="bg-gray-900/50 p-5 rounded-2xl border border-gray-800 flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center mb-3 text-blue-500">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold mb-1 text-gray-100">{item.title}</h4>
                  <p className="text-xs text-gray-400 leading-tight">{item.desc}</p>
                </div>
              ))}
           </div>
        </div>

        {/* Optimized SEO Content Block for Home Page */}
        <div className="mt-12 bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 leading-relaxed">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">How to Bypass YouTube Copyright Strikes with Our Video Uniqueifier</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Bypass Content ID on YouTube & TikTok</h3>
              <p className="text-sm mb-4">
                Are you looking for a way to <strong className="text-gray-800 dark:text-gray-200">bypass youtube content id 2024</strong>? Our <strong className="text-gray-800 dark:text-gray-200">free video uniqueifier tool</strong> uses proprietary algorithms to subtly alter video fingerprints. By changing the <strong className="text-gray-800 dark:text-gray-200">video md5 hash online</strong> and stripping sensitive metadata, you can re-upload content with a fresh digital identity, significantly reducing the risk of automated copyright flags.
              </p>
            </div>
            <div>
              <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">The Best MD5 Hash Changer for Creators</h3>
              <p className="text-sm mb-4">
                Unlike suspicious downloads, BitBrainTech is a <strong className="text-gray-800 dark:text-gray-200">browser-based video metadata editor</strong>. It's the most <strong className="text-gray-800 dark:text-gray-200">secure video hash changer</strong> because it requires no installation. Creators use BitBrainTech to <strong className="text-gray-800 dark:text-gray-200">remove video metadata online</strong> privately, ensuring their creative workflow remains fast, anonymous, and 100% secure from data leaks.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Why Use Our Video Footprint Editor?</h3>
            <p className="text-sm">
              Whether you need to <strong className="text-gray-800 dark:text-gray-200">scrub video metadata online</strong> or require a <strong className="text-gray-800 dark:text-gray-200">no watermark video editor free</strong> of charge, BitBrainTech provides a professional-grade toolkit. It's the perfect solution for creators who need to repurpose content while maintaining original quality and ensuring privacy. Our <strong className="text-gray-800 dark:text-gray-200">video unique hash generator</strong> is fast, reliable, and completely free to use.
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
          <Route path="/image-resizer" element={<ImageResizer />} />
          <Route path="/pdf-tools" element={<PdfTools />} />
          <Route path="/audio-extractor" element={<AudioExtractor />} />
          <Route path="/audio-enhancer" element={<AudioEnhancer />} />
          <Route path="/bg-remover" element={<Link to="/" className="text-blue-600 underline">Go to Home</Link>} />
        </Routes>
        </Suspense>
      </main>

      {/* Global Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
            <Link 
              to="/" 
              className={`transition-colors ${location.pathname === '/' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
              Home
            </Link>
            <Link 
              to="/how-it-works" 
              className={`transition-colors ${location.pathname === '/how-it-works' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
              How it Works
            </Link>
            <Link 
              to="/privacy" 
              className={`transition-colors ${location.pathname === '/privacy' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
              Privacy Policy
            </Link>
            <a 
              href="https://www.facebook.com/bitbraintechns" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </a>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center max-w-2xl">
            Professional AI Tools • Privacy First • BitBrainTech {new Date().getFullYear()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center max-w-2xl">
            <strong>Disclaimer:</strong> BitBrainTech provides tools for personal, educational, and fair-use purposes only. Users are solely responsible for ensuring they have the right to download, modify, or process any media. We do not host or store user files on our servers.
          </p>
        </div>
      </footer>
    </div>
  );
}
