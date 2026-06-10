import React, { useState, useRef, useEffect } from 'react';
import { 
  Music, 
  Upload, 
  Download, 
  Play, 
  Pause, 
  RefreshCw, 
  Wand2, 
  Volume2, 
  Settings2, 
  Trash2,
  CheckCircle2,
  Activity,
  Mic2,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AudioStats {
  duration: number;
  format: string;
  size: number;
}

export default function AudioEnhancer() {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<AudioStats | null>(null);
  const [progress, setProgress] = useState(0);

  // Settings
  const [settings, setSettings] = useState({
    clarity: 60,
    bass: 30,
    compression: 50,
    noiseGate: 20
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isBypassed, setIsBypassed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Audio Nodes
  const lowCutFilterRef = useRef<BiquadFilterNode | null>(null);
  const clarityFilterRef = useRef<BiquadFilterNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  const gateGainNodeRef = useRef<GainNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    // Update filters in real-time when sliders move
    const now = audioContextRef.current?.currentTime || 0;
    
    // If playing pre-rendered enhanced master, neutralize live filters to avoid double-processing
    const shouldNeutralize = isEnhanced && !isBypassed;

    if (clarityFilterRef.current) {
      const g = shouldNeutralize ? 0 : ((settings.clarity - 50) / 1.5);
      clarityFilterRef.current.gain.setTargetAtTime(g, now, 0.1); 
    }
    if (bassFilterRef.current) {
      const g = shouldNeutralize ? 0 : ((settings.bass - 50) / 2);
      bassFilterRef.current.gain.setTargetAtTime(g, now, 0.1);
    }
    if (lowCutFilterRef.current) {
      // Dynamic Low-Cut based on noiseGate setting to "De-Thump"
      const cutFreq = 80 + (settings.noiseGate * 3); // Up to 380Hz for aggressive thumping removal
      const f = (isBypassed || shouldNeutralize) ? 20 : cutFreq;
      lowCutFilterRef.current.frequency.setTargetAtTime(f, now, 0.1);
    }
    if (compressorRef.current) {
      const th = shouldNeutralize ? 0 : (-60 + (settings.compression / 2));
      const r = shouldNeutralize ? 1 : (4 + (settings.compression / 10));
      compressorRef.current.threshold.setTargetAtTime(th, now, 0.1);
      compressorRef.current.ratio.setTargetAtTime(r, now, 0.1);
    }
    if (limiterRef.current) {
      // Peak Limiter to catch 'thok' spikes
      const th = shouldNeutralize ? 0 : -10;
      limiterRef.current.threshold.setTargetAtTime(th, now, 0.1);
      limiterRef.current.ratio.setTargetAtTime(20, now, 0.1);
      limiterRef.current.attack.setTargetAtTime(0.001, now, 0.1);
    }
    if (gainNodeRef.current) {
      const g = shouldNeutralize ? 1 : (isBypassed ? 1 : 1.3);
      gainNodeRef.current.gain.setTargetAtTime(g, now, 0.1);
    }
  }, [settings, isBypassed, isEnhanced]);

  // Noise Gate Loop for Real-time Playback
  useEffect(() => {
    let gateInterval: number;
    if (isPlaying && !isBypassed && gateGainNodeRef.current && analyserRef.current) {
      const analyser = analyserRef.current;
      const gateNode = gateGainNodeRef.current;
      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      
      gateInterval = window.setInterval(() => {
        analyser.getByteTimeDomainData(dataArray);
        let max = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = Math.abs(dataArray[i] - 128);
          if (val > max) max = val;
        }
        
        const volume = max / 128;
        const threshold = settings.noiseGate / 500; // Map 0-100 to 0-0.2
        
        const now = audioContextRef.current?.currentTime || 0;
        if (volume < threshold) {
          gateNode.gain.setTargetAtTime(0, now, 0.05); // Close gate
        } else {
          gateNode.gain.setTargetAtTime(1, now, 0.02); // Open gate
        }
      }, 50);
    }
    return () => clearInterval(gateInterval);
  }, [isPlaying, isBypassed, settings.noiseGate]);

  const toggleBypass = () => {
    const nextBypass = !isBypassed;
    setIsBypassed(nextBypass);
    
    const now = audioContextRef.current?.currentTime || 0;
    
    if (clarityFilterRef.current && bassFilterRef.current && compressorRef.current && lowCutFilterRef.current) {
      if (nextBypass) { // Transitioning to Bypassed (Original)
        clarityFilterRef.current.gain.setTargetAtTime(0, now, 0.05);
        bassFilterRef.current.gain.setTargetAtTime(0, now, 0.05);
        lowCutFilterRef.current.frequency.setTargetAtTime(20, now, 0.05); // No cut
        compressorRef.current.threshold.setTargetAtTime(0, now, 0.05);
      } else { // Transitioning to Enhanced (Studio)
        const shouldNeutralize = isEnhanced;
        if (!shouldNeutralize) {
          clarityFilterRef.current.gain.setTargetAtTime((settings.clarity - 50) / 1.5, now, 0.05);
          bassFilterRef.current.gain.setTargetAtTime((settings.bass - 50) / 2, now, 0.05);
          lowCutFilterRef.current.frequency.setTargetAtTime(100 + (settings.noiseGate * 2), now, 0.05);
          compressorRef.current.threshold.setTargetAtTime(-60 + settings.compression / 2, now, 0.05);
        }
      }
    }

    // Dynamic Hot-Swap if pre-rendered enhanced master is ready
    if (audioRef.current && isEnhanced && enhancedUrl) {
      const wasPlaying = isPlaying;
      const currentTime = audioRef.current.currentTime;
      
      audioRef.current.src = nextBypass ? (audioUrl || '') : (enhancedUrl || '');
      audioRef.current.load();
      audioRef.current.currentTime = currentTime;
      
      if (wasPlaying) {
        audioRef.current.play().catch(e => console.error("Playback swap failed", e));
      }
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('audio/')) {
      const url = URL.createObjectURL(selectedFile);
      setFile(selectedFile);
      setAudioUrl(url);
      setEnhancedUrl(null);
      setIsEnhanced(false);
      setIsBypassed(false);
      setStats({
        duration: 0,
        format: selectedFile.type.split('/')[1].toUpperCase(),
        size: selectedFile.size
      });
    }
  };

  // WAV Encoder Utility
  const audioBufferToWav = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for(i = 0; i < buffer.numberOfChannels; i++)
      channels.push(buffer.getChannelData(i));

    while(pos < length) {
      if (offset >= buffer.length) break;
      for(i = 0; i < numOfChan; i++) {             // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true);          // write 16-bit sample
        pos += 2;
      }
      offset++;                                     // next source sample
    }

    return new Blob([bufferArray], {type: "audio/wav"});

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  };

  // High-performance Transient De-Thump / De-Click Algorithm
  const suppressImpactNoise = (buffer: AudioBuffer, noiseGate: number) => {
    if (noiseGate <= 10) return; // Only process if filter is set over 10
    
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    
    // NoiseGate translates to sensitivity: higher gate means we target lower/quieter impacts as well
    const sensitivity = Math.max(1.1, 5.0 - (noiseGate / 20)); // Threshold multiplier (lower is more sensitive)
    const dampAmount = Math.max(0.005, 1.0 - (noiseGate / 100)); // Lower multiplier is stronger suppression (0% to 90% reduction)
    
    for (let c = 0; c < numOfChan; c++) {
      const channelData = buffer.getChannelData(c);
      const length = channelData.length;
      
      // Moving average of absolute signal levels (speech/background baseline envelope)
      let longTermEnvelope = 0.02;
      const alphaLong = 0.9997; // Slow tracking of the vocal envelope
      
      let i = 2; // offset to look backward
      while (i < length) {
        const val = channelData[i];
        const absVal = Math.abs(val);
        
        // Accumulate a running background baseline reference
        longTermEnvelope = alphaLong * longTermEnvelope + (1 - alphaLong) * absVal;
        
        // Detect sudden rate of change (derivative spike) and magnitude jump
        const prevDiff = Math.abs(channelData[i] - channelData[i - 1]);
        const sharpTransient = prevDiff > longTermEnvelope * sensitivity;
        
        if (sharpTransient && absVal > 0.025) {
          // Sharp impact detected ("thok-thok" or clicking sound)!
          // Suppress/attenuate for the transient length (approx 15ms covers the entire thud vibration)
          const suppressSamples = Math.min(length - i, Math.round(sampleRate * 0.015));
          
          for (let s = 0; s < suppressSamples; s++) {
            const index = i + s;
            // Apply a smooth sinusoidal fade envelope to make the suppression transparent and pop-free
            const progress = s / suppressSamples;
            const dampEnvelope = dampAmount + (1.0 - dampAmount) * Math.sin(progress * Math.PI / 2);
            channelData[index] *= dampEnvelope;
          }
          i += suppressSamples;
        } else {
          i++;
        }
      }
    }
  };

  const processAudio = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      // Simulate analysis phase
      for (let i = 0; i <= 40; i += 5) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      // Real Rendering using OfflineAudioContext
      const arrayBuffer = await file.arrayBuffer();
      const offlineCtx = new OfflineAudioContext(2, 44100 * 300, 44100); // 5 min max for safety
      const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
      
      const realOfflineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = realOfflineCtx.createBufferSource();
      source.buffer = audioBuffer;

      // Improved Filter Chain
      const lowCut = realOfflineCtx.createBiquadFilter();
      lowCut.type = 'highpass';
      lowCut.frequency.value = 110 + (settings.noiseGate * 2); // De-Thump lower rumble

      const clarity = realOfflineCtx.createBiquadFilter();
      clarity.type = 'peaking';
      clarity.frequency.value = 3500;
      clarity.gain.value = (settings.clarity - 50) / 1.5;

      const bass = realOfflineCtx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 200;
      bass.gain.value = (settings.bass - 50) / 2;

      const comp = realOfflineCtx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-60 + settings.compression / 2, 0);
      comp.knee.setValueAtTime(30, 0);
      comp.ratio.setValueAtTime(settings.noiseGate > 50 ? 12 : 4, 0);
      comp.attack.setValueAtTime(0.005, 0);
      comp.release.setValueAtTime(0.2, 0);

      // Limiter to catch 'thok' spikes in rendered file
      const limiter = realOfflineCtx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-10, 0);
      limiter.ratio.setValueAtTime(20, 0);
      limiter.attack.setValueAtTime(0.001, 0);

      const outputGain = realOfflineCtx.createGain();
      outputGain.gain.value = 1.3;

      source.connect(lowCut);
      lowCut.connect(clarity);
      clarity.connect(bass);
      bass.connect(comp);
      comp.connect(limiter);
      limiter.connect(outputGain);
      outputGain.connect(realOfflineCtx.destination);

      source.start();

      for (let i = 45; i <= 95; i += 5) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const renderedBuffer = await realOfflineCtx.startRendering();
      
      // Apply the heavy-duty Transient Impact Noise Suppressor directly to the rendered audio buffer!
      suppressImpactNoise(renderedBuffer, settings.noiseGate);

      const wavBlob = audioBufferToWav(renderedBuffer);
      const enhancedLink = URL.createObjectURL(wavBlob);
      
      setEnhancedUrl(enhancedLink);
      setIsEnhanced(true);
      setProgress(100);

      // Instantly swap source and load enhanced master WAV for real-time play test
      if (audioRef.current) {
        const wasPlaying = isPlaying;
        const currentTime = audioRef.current.currentTime;
        audioRef.current.src = enhancedLink;
        audioRef.current.load();
        audioRef.current.currentTime = currentTime;
        if (wasPlaying) {
          audioRef.current.play().catch(e => console.error("Playback master load failed", e));
        }
      }
    } catch (error) {
      console.error("Enhancement failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadEnahanced = () => {
    if (!enhancedUrl) return;
    const a = document.createElement('a');
    a.href = enhancedUrl;
    a.download = `Enhanced_${file?.name.split('.')[0]}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        ctx.fillStyle = (!isBypassed && isEnhanced) || (!isProcessing && isPlaying && !isBypassed) ? '#6366f1' : '#94a3b8';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  useEffect(() => {
    if (isPlaying) {
      drawVisualizer();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isEnhanced, isBypassed]);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      
      // Setup Real-time Filter Chain
      lowCutFilterRef.current = audioContextRef.current.createBiquadFilter();
      lowCutFilterRef.current.type = 'highpass';
      lowCutFilterRef.current.frequency.value = 100 + (settings.noiseGate * 2);

      clarityFilterRef.current = audioContextRef.current.createBiquadFilter();
      clarityFilterRef.current.type = 'peaking';
      clarityFilterRef.current.frequency.value = 3500;
      clarityFilterRef.current.gain.value = (settings.clarity - 50) / 1.5;

      bassFilterRef.current = audioContextRef.current.createBiquadFilter();
      bassFilterRef.current.type = 'lowshelf';
      bassFilterRef.current.frequency.value = 200;
      bassFilterRef.current.gain.value = (settings.bass - 50) / 2;

      compressorRef.current = audioContextRef.current.createDynamicsCompressor();
      compressorRef.current.threshold.setValueAtTime(-60 + settings.compression / 2, 0);

      limiterRef.current = audioContextRef.current.createDynamicsCompressor();
      limiterRef.current.threshold.setValueAtTime(-10, 0);
      limiterRef.current.ratio.setValueAtTime(20, 0);
      limiterRef.current.attack.setValueAtTime(0.001, 0);

      gateGainNodeRef.current = audioContextRef.current.createGain();
      
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 1.3;

      // Connect nodes: Source -> LowCut -> Clarity -> Bass -> Compressor -> Limiter -> Gate -> Gain -> Analyser -> Dest
      sourceNodeRef.current.connect(lowCutFilterRef.current);
      lowCutFilterRef.current.connect(clarityFilterRef.current);
      clarityFilterRef.current.connect(bassFilterRef.current);
      bassFilterRef.current.connect(compressorRef.current);
      compressorRef.current.connect(limiterRef.current);
      limiterRef.current.connect(gateGainNodeRef.current);
      gateGainNodeRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioContextRef.current.resume();
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const reset = () => {
    setFile(null);
    setAudioUrl(null);
    setEnhancedUrl(null);
    setIsEnhanced(false);
    setIsPlaying(false);
    setStats(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
          <Activity className="w-3 h-3" /> Audio Engine v2.0
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 dark:text-white leading-tight uppercase mb-4">
          Studio <span className="text-indigo-600">Audio Enhancer</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
          Transform noisy recordings into studio-quality audio. 
          Bypass background noise, boost clarity, and normalize levels 100% locally.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          {!file ? (
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => fileInputRef.current?.click()}
              className="group relative cursor-pointer"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[32px] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative aspect-[21/9] flex flex-col items-center justify-center bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[32px] hover:border-indigo-500/50 transition-all overflow-hidden">
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-500">
                  <Upload className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Drop your audio file here</h3>
                <p className="text-gray-500 text-sm font-medium">MP3, WAV, or M4A (Max 50MB)</p>
                <div className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20">
                  Choose File
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFile}
                accept="audio/*"
                className="hidden" 
              />
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Main Player Card */}
              <div className="bg-white dark:bg-gray-900 rounded-[40px] p-8 shadow-2xl shadow-indigo-600/10 border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  {/* CD Visualizer */}
                  <div className="relative group">
                    <div className={`w-40 h-40 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center border-8 border-gray-100 dark:border-gray-800 shadow-xl transition-transform duration-1000 ${isPlaying ? 'animate-spin-slow' : ''}`}>
                      <div className="w-12 h-12 bg-white rounded-full border-4 border-indigo-600 flex items-center justify-center overflow-hidden">
                        <Music className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                    {isEnhanced && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white truncate max-w-md mb-2">{file.name}</h3>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                        {stats?.format}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                        {(stats!.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 h-24 mb-6 overflow-hidden flex items-end">
                      <canvas ref={canvasRef} width={600} height={80} className="w-full h-full opacity-60" />
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      <button 
                        onClick={togglePlayback}
                        className="w-16 h-16 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-xl"
                      >
                        {isPlaying ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
                      </button>

                      {isPlaying && (
                        <button
                          onClick={toggleBypass}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${
                            isBypassed 
                              ? 'bg-gray-200 dark:bg-gray-800 text-gray-500' 
                              : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 border border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          {isBypassed ? 'Original' : 'Studio Mix'}
                        </button>
                      )}

                      {!isEnhanced ? (
                        <button
                          onClick={processAudio}
                          disabled={isProcessing}
                          className="px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-sm tracking-tighter shadow-xl shadow-indigo-600/20 flex items-center gap-3 hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              Processing {progress}%
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-5 h-5" />
                              Enhance Audio
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={downloadEnahanced}
                          className="px-8 py-4 bg-green-600 text-white rounded-[24px] font-black uppercase text-sm tracking-tighter shadow-xl shadow-green-600/20 flex items-center gap-3 hover:bg-green-700 animate-pulse-slow"
                        >
                          <Download className="w-5 h-5" />
                          Download Studio Mix
                        </button>
                      )}

                      <button 
                        onClick={reset}
                        className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-indigo-600" /> Audio Balance
                  </h4>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Voice Clarity</span>
                        <span className="text-sm font-black text-indigo-600">{settings.clarity}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={settings.clarity}
                        onChange={(e) => setSettings({...settings, clarity: parseInt(e.target.value)})}
                        className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Bass Boost</span>
                        <span className="text-sm font-black text-indigo-600">{settings.bass}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={settings.bass}
                        onChange={(e) => setSettings({...settings, bass: parseInt(e.target.value)})}
                        className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-indigo-600" /> Dynamics Processor
                  </h4>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Noise Gate</span>
                        <span className="text-sm font-black text-indigo-600">{settings.noiseGate}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={settings.noiseGate}
                        onChange={(e) => setSettings({...settings, noiseGate: parseInt(e.target.value)})}
                        className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Auto Normalization</span>
                        <span className="text-sm font-black text-indigo-600">{settings.compression}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={settings.compression}
                        onChange={(e) => setSettings({...settings, compression: parseInt(e.target.value)})}
                        className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <audio 
                ref={audioRef} 
                src={(isEnhanced && !isBypassed) ? (enhancedUrl || '') : (audioUrl || '')} 
                onEnded={() => setIsPlaying(false)}
                className="hidden" 
              />
            </div>
          )}
        </div>
      </div>

      {/* SEO Content Block */}
      <div className="mt-16 bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-sm border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 leading-relaxed">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 text-center uppercase tracking-tighter">AI Audio Enhancer: Studio Quality Free Online</h2>
        
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Clean Your Audio with AI Processing</h3>
            <p className="text-sm mb-4">
              Need to <strong className="text-gray-800 dark:text-gray-100">remove background noise from audio free</strong>? Our <strong className="text-gray-800 dark:text-gray-100">AI audio enhancer</strong> uses a multi-stage DSP (Digital Signal Processing) chain to clean recordings instantly. Whether you have a noisy podcast, a muffled voice note, or a quiet lecture, our <strong className="text-gray-800 dark:text-gray-100">voice enhancer online</strong> tool brings studio-level clarity without professional equipment.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">The Most Private Audio Cleaner Tool</h3>
            <p className="text-sm mb-4">
              Privacy is everything. Unlike cloud-based tools, BitBrainTech is a <strong className="text-gray-800 dark:text-gray-100">browser-based audio software</strong>. This means your private voice recordings never leave your device. It is the most <strong className="text-gray-800 dark:text-gray-100">secure audio voice enhancer</strong> available, giving you professional <strong className="text-gray-800 dark:text-gray-100">noise reduction online</strong> with total peace of mind.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Advanced Audio Normalization & Compression</h3>
          <p className="text-sm">
            Professional audio requires balanced levels. Our <strong className="text-gray-800 dark:text-gray-100">free mp3 enhancer</strong> automatically applies dynamic range compression and normalization. This ensures your audio is consistently loud and clear, making it the perfect <strong className="text-gray-800 dark:text-gray-100">podcast quality enhancer</strong> for creators, students, and businesses. Download high-quality enhanced audio for free with no daily limits.
          </p>
        </div>
      </div>
    </div>
  );
}
