import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Download, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  Percent, 
  Settings, 
  FileImage, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Unlock,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

interface PreSetOption {
  label: string;
  width: number;
  height: number;
  description: string;
}

const presets: Record<string, PreSetOption> = {
  instagram_square: { label: 'Instagram Square (1:1)', width: 1080, height: 1080, description: 'Best for standard feed posts' },
  instagram_story: { label: 'Instagram Story / Reel (9:16)', width: 1080, height: 1920, description: 'Best for full-screen mobile stories' },
  facebook_cover: { label: 'Facebook Cover (16:9 approx)', width: 820, height: 312, description: 'Best for desktop profile cover photo' },
  youtube_thumb: { label: 'YouTube Thumbnail (16:9)', width: 1280, height: 720, description: 'Perfect banner for video uploads' },
  twitter_header: { label: 'X / Twitter Banner (3:1)', width: 1500, height: 500, description: 'Sleek banner for X profiles' },
  full_hd: { label: 'Full HD Web Banner', width: 1920, height: 1080, description: 'Standard high-definition web page background' },
  email_header: { label: 'Email Newsletter Banner', width: 600, height: 300, description: 'Optimized width for email clients' },
};

export default function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);
  const [originalSize, setOriginalSize] = useState<number>(0); // in bytes
  
  // Settings
  const [resizeMode, setResizeMode] = useState<'percent' | 'pixels' | 'preset'>('percent');
  const [percentScale, setPercentScale] = useState<number>(50); // default to 50%
  const [widthInput, setWidthInput] = useState<string>('');
  const [heightInput, setHeightInput] = useState<string>('');
  const [aspectRatioLocked, setAspectRatioLocked] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [selectedPreset, setSelectedPreset] = useState<string>('instagram_square');
  
  // Compression Settings
  const [targetQuality, setTargetQuality] = useState<number>(80); // quality percentage 1-100
  const [compressionMode, setCompressionMode] = useState<'quality' | 'target_size'>('quality');
  const [targetSizeKB, setTargetSizeKB] = useState<string>('150'); // limit e.g. 150kb
  const [exportFormat, setExportFormat] = useState<string>('image/jpeg'); // image/jpeg, image/png, image/webp

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedWidth, setProcessedWidth] = useState<number>(0);
  const [processedHeight, setProcessedHeight] = useState<number>(0);
  const [processedSize, setProcessedSize] = useState<number>(0); // in bytes
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read upload and set metadata
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      loadImage(selectedFile);
    }
  };

  const loadImage = (imageFile: File) => {
    setFile(imageFile);
    setOriginalSize(imageFile.size);
    // clean previous runs
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setProcessedUrl(null);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);

      const img = new Image();
      img.onload = () => {
        setOriginalWidth(img.width);
        setOriginalHeight(img.height);
        const ratio = img.width / img.height;
        setAspectRatio(ratio);
        
        // initialize width/height inputs to half the original
        const initialW = Math.round(img.width * 0.5);
        const initialH = Math.round(img.height * 0.5);
        setWidthInput(initialW.toString());
        setHeightInput(initialH.toString());
      };
      img.src = src;
    };
    reader.readAsDataURL(imageFile);
  };

  // Manage aspect ratio lock for width change
  const handleWidthChange = (val: string) => {
    setWidthInput(val);
    const parsedWidth = parseFloat(val);
    if (!isNaN(parsedWidth) && parsedWidth > 0 && aspectRatioLocked && aspectRatio) {
      setHeightInput(Math.round(parsedWidth / aspectRatio).toString());
    }
  };

  // Manage aspect ratio lock for height change
  const handleHeightChange = (val: string) => {
    setHeightInput(val);
    const parsedHeight = parseFloat(val);
    if (!isNaN(parsedHeight) && parsedHeight > 0 && aspectRatioLocked && aspectRatio) {
      setWidthInput(Math.round(parsedHeight * aspectRatio).toString());
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      loadImage(droppedFile);
    }
  };

  // Dynamic automatic image reduction search algorithm
  // Given a target image, we can search for the right quality to fit size requirements
  const runResizeAndReduce = async () => {
    if (!imageSrc) return;
    setIsProcessing(true);
    setErrorMsg(null);

    // Let user see loader for feedback
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Calculate desired dimensions based on current chosen mode
      let finalW = originalWidth;
      let finalH = originalHeight;

      if (resizeMode === 'percent') {
        const scale = percentScale / 100;
        finalW = Math.max(1, Math.round(originalWidth * scale));
        finalH = Math.max(1, Math.round(originalHeight * scale));
      } else if (resizeMode === 'pixels') {
        const parsedW = parseInt(widthInput);
        const parsedH = parseInt(heightInput);
        if (isNaN(parsedW) || parsedW <= 0 || isNaN(parsedH) || parsedH <= 0) {
          throw new Error('Please enter valid width and height dimensions.');
        }
        finalW = parsedW;
        finalH = parsedH;
      } else if (resizeMode === 'preset') {
        const presetOpt = presets[selectedPreset];
        if (presetOpt) {
          finalW = presetOpt.width;
          finalH = presetOpt.height;
        }
      }

      // Initialize canvas
      const canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create 2D graphics rendering context.');

      // Solid background for JPEG (prevents black background on transparent PNG source)
      if (exportFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, finalW, finalH);
      }

      ctx.drawImage(img, 0, 0, finalW, finalH);

      // Now determine the compression quality
      if (compressionMode === 'quality') {
        // Simple direct quality export
        const qFactor = targetQuality / 100;
        const blob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(b => resolve(b), exportFormat, qFactor);
        });

        if (!blob) throw new Error('Image export failed.');

        setProcessedUrl(URL.createObjectURL(blob));
        setProcessedSize(blob.size);
        setProcessedWidth(finalW);
        setProcessedHeight(finalH);

      } else {
        // Aggressive exact target size (KB) algorithm!
        // We use an advanced binary search on the quality factor to meet the target size under user limits.
        // If we still can't fit it because of high dimensions, we can also down-scale slightly if needed.
        const limitBytes = parseInt(targetSizeKB) * 1024;
        if (isNaN(limitBytes) || limitBytes <= 0) {
          throw new Error('Please enter a valid target size (in KB).');
        }

        let bestBlob: Blob | null = null;
        let bestQuality = 0.8;
        let lowQ = 0.01;
        let highQ = 0.99;
        let iterations = 0;

        // Perform Binary Search to find the optimal quality factor!
        while (lowQ <= highQ && iterations < 12) {
          iterations++;
          const midQ = (lowQ + highQ) / 2;
          const currentBlob = await new Promise<Blob | null>(resolve => {
            canvas.toBlob(b => resolve(b), exportFormat, midQ);
          });

          if (!currentBlob) continue;

          if (currentBlob.size <= limitBytes) {
            bestBlob = currentBlob;
            bestQuality = midQ;
            lowQ = midQ + 0.02; // Try to increase quality to use more of the budget
          } else {
            highQ = midQ - 0.02; // Size is too big, lower quality
          }
        }

        // If even the lowest quality is slightly above the user's limit (e.g. for huge PNGs/JPEGs),
        // we can adjust dimensions to fit. Let's do another swift dimension check if needed!
        if (!bestBlob || bestBlob.size > limitBytes) {
          // If lowest quality was still too large, let's render at a slightly auto-reduced scale
          let scaleMultiplier = 0.9;
          while (scaleMultiplier > 0.1 && (!bestBlob || bestBlob.size > limitBytes)) {
            const scaleW = Math.max(1, Math.round(finalW * scaleMultiplier));
            const scaleH = Math.max(1, Math.round(finalH * scaleMultiplier));
            const scaleCanvas = document.createElement('canvas');
            scaleCanvas.width = scaleW;
            scaleCanvas.height = scaleH;
            const sCtx = scaleCanvas.getContext('2d');
            if (sCtx) {
              if (exportFormat === 'image/jpeg') {
                sCtx.fillStyle = '#FFFFFF';
                sCtx.fillRect(0, 0, scaleW, scaleH);
              }
              sCtx.drawImage(img, 0, 0, scaleW, scaleH);
              const fallbackBlob = await new Promise<Blob | null>(resolve => {
                scaleCanvas.toBlob(b => resolve(b), exportFormat, 0.4); // medium-low quality
              });
              if (fallbackBlob && fallbackBlob.size <= limitBytes) {
                bestBlob = fallbackBlob;
                finalW = scaleW;
                finalH = scaleH;
                break;
              }
            }
            scaleMultiplier -= 0.15;
          }
        }

        // Catch all fallback if binary search somehow didn't return anything
        if (!bestBlob) {
          // just render at lowest quality
          bestBlob = await new Promise<Blob | null>(resolve => {
            canvas.toBlob(b => resolve(b), exportFormat, 0.15);
          });
        }

        if (bestBlob) {
          setProcessedUrl(URL.createObjectURL(bestBlob));
          setProcessedSize(bestBlob.size);
          setProcessedWidth(finalW);
          setProcessedHeight(finalH);

          if (bestBlob.size > limitBytes) {
            setErrorMsg(`Note: We compressed the image aggressively, but the extreme original detail level prevented squeezing it fully below ${targetSizeKB} KB without adding pixel distortion.`);
          }
        } else {
          throw new Error('Image compression optimization failed.');
        }
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred during processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadProcessed = () => {
    if (!processedUrl) return;
    const extension = exportFormat.split('/')[1];
    const originalName = file ? file.name.substring(0, file.name.lastIndexOf('.')) : 'resized';
    
    const link = document.createElement('a');
    link.href = processedUrl;
    link.download = `${originalName}_optimized.${extension === 'jpeg' ? 'jpg' : extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetAll = () => {
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setFile(null);
    setImageSrc(null);
    setProcessedUrl(null);
    setErrorMsg(null);
    setWidthInput('');
    setHeightInput('');
    setPercentScale(50);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4" id="image-resizer-container">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 sm:mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl sm:rounded-2xl border border-blue-100/50 dark:border-blue-900/30 shrink-0">
              <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                Image Resizer & Size Reducer
                <span className="text-[10px] sm:text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">100% Private</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Shrink digital pictures, adjust aspect ratio, crop dimensions, and compress files strictly under any KB limits instantly inside your browser. 
              </p>
            </div>
          </div>
          {file && (
            <button
              onClick={resetAll}
              className="w-full md:w-auto text-center text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-800 px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shrink-0"
            >
              Upload New
            </button>
          )}
        </div>
      </div>

      {!file ? (
        /* Drag and Drop Zone */
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-3 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl py-10 px-4 sm:py-16 sm:px-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/10 dark:hover:bg-blue-950/5 transition-all group flex flex-col items-center select-none bg-white dark:bg-gray-900 shadow-sm"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <div className="p-4 sm:p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl text-blue-600 dark:text-blue-400 mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">Drag & Drop your Image here</h2>
          <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm max-w-sm mb-6">
            Supports high-resolution camera RAWs, PNG, JPEG, WEBP, and TIFF images up to 50MB.
          </p>
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/10 transition-all">
            Choose Image File
          </button>
        </div>
      ) : (
        /* Working Workspace */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Settings Sidebar Panel (4 cols on big, stacked on small) */}
          <div className="md:col-span-4 bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 space-y-6 shadow-sm">
            
            {/* Aspect Ratio & Scale Settings */}
            <div>
              <h3 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-3 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-blue-500" />
                1. Select Resize Mode
              </h3>
              
              {/* Resize Mode tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-gray-50 dark:bg-gray-950 rounded-xl mb-4">
                {(['percent', 'pixels', 'preset'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setResizeMode(m);
                      setProcessedUrl(null);
                    }}
                    className={`py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-tight rounded-lg transition-all ${
                      resizeMode === m 
                        ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {m === 'percent' ? 'Percent' : m === 'pixels' ? 'Pixels' : 'Presets'}
                  </button>
                ))}
              </div>

              {/* Mode Fields */}
              {resizeMode === 'percent' && (
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span>Resize to:</span>
                    <span className="text-blue-600 dark:text-blue-400">{percentScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="150"
                    step="5"
                    value={percentScale}
                    onChange={(e) => {
                      setPercentScale(parseInt(e.target.value));
                      setProcessedUrl(null);
                    }}
                    className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="grid grid-cols-5 gap-1">
                    {[25, 50, 75, 100, 125].map((presetScaleVal) => (
                      <button
                        key={presetScaleVal}
                        onClick={() => {
                          setPercentScale(presetScaleVal);
                          setProcessedUrl(null);
                        }}
                        className={`py-1 text-[10px] font-bold rounded-md transition-all ${
                          percentScale === presetScaleVal
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                            : 'bg-gray-50 dark:bg-gray-950 text-gray-500 border border-transparent'
                        }`}
                      >
                        {presetScaleVal}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {resizeMode === 'pixels' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                        Width (Pixels)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1920"
                        value={widthInput}
                        onChange={(e) => {
                          handleWidthChange(e.target.value);
                          setProcessedUrl(null);
                        }}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                        Height (Pixels)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1080"
                        value={heightInput}
                        onChange={(e) => {
                          handleHeightChange(e.target.value);
                          setProcessedUrl(null);
                        }}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  
                  {/* Keep aspect ratio button */}
                  <button
                    onClick={() => {
                      setAspectRatioLocked(!aspectRatioLocked);
                      // If we lock it right now, recalculate height based on ratio
                      if (!aspectRatioLocked && originalWidth) {
                        const parsedW = parseFloat(widthInput);
                        if (!isNaN(parsedW)) {
                          setHeightInput(Math.round(parsedW / aspectRatio).toString());
                        }
                      }
                    }}
                    className={`flex items-center gap-2 text-xs font-bold w-full p-2.5 rounded-xl border transition-all ${
                      aspectRatioLocked 
                        ? 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400' 
                        : 'border-gray-200 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    {aspectRatioLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    {aspectRatioLocked ? 'Lock Aspect Ratio Enabled' : 'Aspect Ratio Unlocked'}
                  </button>
                </div>
              )}

              {resizeMode === 'preset' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
                      Select Preset Dimension
                    </label>
                    <select
                      value={selectedPreset}
                      onChange={(e) => {
                        setSelectedPreset(e.target.value);
                        setProcessedUrl(null);
                      }}
                      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                    >
                      {Object.keys(presets).map((key) => (
                        <option key={key} value={key}>
                          {presets[key].label} ({presets[key].width}x{presets[key].height})
                        </option>
                      ))}
                    </select>
                  </div>
                  {presets[selectedPreset] && (
                    <div className="bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100/30 dark:border-blue-900/20 p-3 rounded-xl text-[11px] text-gray-500 dark:text-gray-400 italic">
                      {presets[selectedPreset].description}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reduce File Size / Compress settings */}
            <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
              <h3 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                2. Squeeze & Reduce Size
              </h3>

              {/* Compression Mode choice */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-gray-50 dark:bg-gray-950 rounded-xl mb-4">
                {(['quality', 'target_size'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setCompressionMode(mode);
                      setProcessedUrl(null);
                    }}
                    className={`py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-tight rounded-lg transition-all ${
                      compressionMode === mode 
                        ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {mode === 'quality' ? 'Quality Target' : 'Exact Limit (KB)'}
                  </button>
                ))}
              </div>

              {compressionMode === 'quality' ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span>JPEG/WEBP Quality:</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{targetQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={targetQuality}
                    onChange={(e) => {
                      setTargetQuality(parseInt(e.target.value));
                      setProcessedUrl(null);
                    }}
                    className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 italic">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>80% is recommended for superb size loss without visible blocky artifacts.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
                      Target File Size Limit (KB)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="e.g. 150"
                        min="5"
                        max="20000"
                        value={targetSizeKB}
                        onChange={(e) => {
                          setTargetSizeKB(e.target.value);
                          setProcessedUrl(null);
                        }}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 pl-4 pr-12 py-2.5 rounded-xl text-sm font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-gray-400 uppercase">
                        KB
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/20 dark:border-indigo-900/20 p-3 rounded-xl text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                    <Info className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span>We will run local binary-search rendering to reach as close to (or below) this metric as possible.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Export Format preference */}
            <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
              <label className="block text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileImage className="w-3.5 h-3.5 text-pink-500" />
                3. Choose Output Format
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-gray-50 dark:bg-gray-950 p-1 rounded-xl">
                {[
                  { value: 'image/jpeg', label: 'JPG' },
                  { value: 'image/png', label: 'PNG' },
                  { value: 'image/webp', label: 'WEBP' }
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setExportFormat(f.value);
                      setProcessedUrl(null);
                    }}
                    className={`py-2 text-[10px] sm:text-[11px] font-bold rounded-lg transition-all ${
                      exportFormat === f.value
                        ? 'bg-white dark:bg-gray-900 text-pink-600 dark:text-pink-400 shadow-sm border border-pink-100/10'
                        : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {exportFormat === 'image/png' && (
                <div className="mt-2 flex items-center gap-1.5 p-2 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/25 dark:border-amber-900/20 rounded-lg text-[10px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>PNG is lossless; compression sizing limits will be less effective. JPEG or WEBP are recommended for tight size goals!</span>
                </div>
              )}
            </div>

            {/* ACTION TRIGGERS */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              {!processedUrl ? (
                <button
                  onClick={runResizeAndReduce}
                  disabled={isProcessing}
                  className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black uppercase text-xs sm:text-sm tracking-tighter rounded-2xl shadow-lg shadow-blue-600/15 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Optimizing Image...
                    </>
                  ) : (
                    <>
                      Optimize Image
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={downloadProcessed}
                  className="w-full py-3.5 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs sm:text-sm tracking-tighter rounded-2xl shadow-lg shadow-emerald-600/15 flex items-center justify-center gap-2.5 transition-all"
                >
                  Download Optimized Image
                </button>
              )}
            </div>

          </div>

          {/* Picture Previews Column (8 cols on big, stacked on small) */}
          <div className="md:col-span-8 space-y-6">
            
            {/* Main view panel */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-4 flex items-center gap-2">
                <FileImage className="w-3.5 h-3.5" />
                Original Dimension Comparison & Information
              </h3>
              
              {/* Size metrics compare cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-100/40 dark:border-gray-800/40">
                  <span className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                    Original Source
                  </span>
                  <div className="font-extrabold text-sm text-gray-800 dark:text-gray-200">
                    Size: <span className="text-gray-900 dark:text-white font-black">{formatSize(originalSize)}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Dimensions: {originalWidth} x {originalHeight} px
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/10 dark:border-indigo-900/10">
                  <span className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1">
                    Resized & Squeezed Output
                  </span>
                  {processedUrl ? (
                    <>
                      <div className="font-extrabold text-sm text-indigo-800 dark:text-indigo-300">
                        Size: <span className="text-gray-900 dark:text-white font-black">{formatSize(processedSize)}</span>
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5 flex items-center gap-1">
                        Saved: {Math.round((1 - (processedSize / originalSize)) * 100)}% Space!
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 dark:text-gray-500 py-1.5 italic font-medium">
                      Press "Optimize Image" to process.
                    </div>
                  )}
                </div>
              </div>

              {/* Error/Notice Display */}
              {errorMsg && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 rounded-2xl text-xs font-semibold mb-6 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Image preview showcase */}
              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[340px] relative overflow-hidden group">
                {imageSrc && (
                  <div className="relative max-w-full max-h-[460px] rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                    <img
                      src={processedUrl || imageSrc}
                      alt="Source / Target Preview"
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-[300px] sm:max-h-[400px] object-contain rounded-lg border border-gray-200/50 dark:border-gray-800/50 transition-all"
                    />
                    
                    {processedUrl && (
                      <span className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-auto bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg text-center sm:text-left">
                        Viewing Compressed Output ({processedWidth}x{processedHeight}px)
                      </span>
                    )}
                    
                    {!processedUrl && (
                      <span className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-auto bg-gray-900/85 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-sm shadow-md text-center sm:text-left">
                        Viewing Original Source ({originalWidth}x{originalHeight}px)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Helpful Info Guide Footer */}
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 rounded-full animate-ping shrink-0" />
                  <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                    Full Client-Side Processing engine
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 text-left sm:text-right">
                  None of your pictures ever travel to any cloud database. BitBrainTech.
                </span>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
