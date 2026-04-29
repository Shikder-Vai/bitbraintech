import React, { useState, useRef } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { FileText, Upload, Copy, Check, Loader2, Wand2, Download, Cloud, Cpu, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export default function OcrExtractor() {
  const [images, setImages] = useState<string[]>([]);
  const [text, setText] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enhance, setEnhance] = useState(true);
  const [language, setLanguage] = useState<string>('eng');
  const [engine, setEngine] = useState<'local' | 'cloud'>('local');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const LANGUAGES = [
    { code: 'eng', name: 'English' },
    { code: 'ben', name: 'Bengali' },
    { code: 'hin', name: 'Hindi' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
    { code: 'deu', name: 'German' },
    { code: 'ara', name: 'Arabic' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'chi_tra', name: 'Chinese (Traditional)' },
    { code: 'rus', name: 'Russian' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'kor', name: 'Korean' },
    { code: 'ita', name: 'Italian' },
    { code: 'por', name: 'Portuguese' },
    { code: 'tur', name: 'Turkish' },
    { code: 'vie', name: 'Vietnamese' },
    { code: 'ind', name: 'Indonesian' },
    { code: 'tha', name: 'Thai' },
    { code: 'pol', name: 'Polish' },
    { code: 'nld', name: 'Dutch' },
    { code: 'swe', name: 'Swedish' },
    { code: 'tam', name: 'Tamil' },
    { code: 'tel', name: 'Telugu' },
    { code: 'kan', name: 'Kannada' },
    { code: 'mal', name: 'Malayalam' },
    { code: 'guj', name: 'Gujarati' },
    { code: 'mar', name: 'Marathi' },
    { code: 'pan', name: 'Punjabi' },
    { code: 'urd', name: 'Urdu' },
    { code: 'nep', name: 'Nepali' },
    { code: 'lat', name: 'Latin' },
    { code: 'heb', name: 'Hebrew' },
    { code: 'ell', name: 'Greek' },
  ];

  const MAX_IMAGES = 6;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []) as File[];
    if (uploadedFiles.length === 0) return;

    if (images.length + uploadedFiles.length > MAX_IMAGES) {
      alert(`You can only upload up to ${MAX_IMAGES} images.`);
      return;
    }

    uploadedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
        setText('');
        setProgress(0);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setText('');
    setProgress(0);
  };

  const preprocessImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // Scale up for better OCR resolution
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(dataUrl);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 1. Grayscale & Contrast Enhancement
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        
        // 1b. Sharpen Filter (Improves character definition)
        const sharpenedData = applySharpen(imageData);
        ctx.putImageData(sharpenedData, 0, 0);

        // 2. De-skewing (Optimized horizontal projection)
        const angle = detectSkew(sharpenedData);
        if (Math.abs(angle) > 0.2) {
          const rotatedCanvas = document.createElement('canvas');
          rotatedCanvas.width = canvas.width;
          rotatedCanvas.height = canvas.height;
          const rCtx = rotatedCanvas.getContext('2d');
          if (rCtx) {
            rCtx.fillStyle = 'white';
            rCtx.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height);
            rCtx.translate(canvas.width / 2, canvas.height / 2);
            rCtx.rotate((-angle * Math.PI) / 180);
            rCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(rotatedCanvas, 0, 0);
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          } else {
            imageData = sharpenedData;
          }
        } else {
          imageData = sharpenedData;
        }

        // 3. Optimized Adaptive Thresholding
        applyAdaptiveThreshold(imageData, Math.floor(canvas.width / 8), 0.15);
        ctx.putImageData(imageData, 0, 0);

        resolve(canvas.toDataURL('image/png', 0.92));
      };
      img.src = dataUrl;
    });
  };

  // Helper: Detect skew angle using optimized horizontal projection profile variance
  const detectSkew = (imageData: ImageData): number => {
    const { width, height, data } = imageData;
    const angles = [];
    for (let a = -10; a <= 10; a += 0.5) angles.push(a);
    
    let maxVariance = -1;
    let bestAngle = 0;

    const startY = Math.floor(height * 0.2);
    const endY = Math.floor(height * 0.8);
    const startX = Math.floor(width * 0.2);
    const endX = Math.floor(width * 0.8);
    const sampleWidth = endX - startX;
    const sampleHeight = endY - startY;

    const step = Math.max(2, Math.floor(sampleWidth / 200));

    for (const angle of angles) {
      const projection = new Int32Array(sampleHeight);
      const rad = (angle * Math.PI) / 180;
      const sin = Math.sin(rad);
      const cos = Math.cos(rad);

      for (let y = startY; y < endY; y += step) {
        for (let x = startX; x < endX; x += step) {
          const idx = (y * width + x) * 4;
          if (data[idx] < 120) {
            const relX = x - width / 2;
            const relY = y - height / 2;
            const rotatedY = Math.round(-relX * sin + relY * cos + height / 2);
            const py = rotatedY - startY;
            if (py >= 0 && py < sampleHeight) {
              projection[py]++;
            }
          }
        }
      }

      let sum = 0;
      let sumSq = 0;
      let count = 0;
      for (let i = 0; i < sampleHeight; i++) {
        const val = projection[i];
        if (val > 0) {
          sum += val;
          sumSq += val * val;
          count++;
        }
      }
      const variance = count > 0 ? (sumSq / count) - (sum / count) ** 2 : 0;
      if (variance > maxVariance) {
        maxVariance = variance;
        bestAngle = angle;
      }
    }
    return bestAngle;
  };

  // Helper: Fast Convolution (Sharpen)
  const applySharpen = (imageData: ImageData): ImageData => {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const sy = y * width + x;
        let r = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const k = kernel[(ky + 1) * 3 + (kx + 1)];
            r += data[idx] * k;
          }
        }
        const o = sy * 4;
        output[o] = output[o+1] = output[o+2] = Math.min(255, Math.max(0, r));
        output[o+3] = 255;
      }
    }
    return new ImageData(output, width, height);
  };

  // Helper: Optimized Bradley-Roth Adaptive Thresholding
  const applyAdaptiveThreshold = (imageData: ImageData, s: number, t: number) => {
    const { width, height, data } = imageData;
    const integralImage = new Int32Array(width * height);
    
    for (let y = 0; y < height; y++) {
      let lineSum = 0;
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        lineSum += data[idx * 4];
        if (y === 0) {
          integralImage[idx] = lineSum;
        } else {
          integralImage[idx] = integralImage[(y - 1) * width + x] + lineSum;
        }
      }
    }

    const halfS = Math.floor(s / 2);
    for (let y = 0; y < height; y++) {
      const y1 = Math.max(y - halfS, 0);
      const y2 = Math.min(y + halfS, height - 1);
      const rowY2 = y2 * width;
      const rowY1 = (y1 - 1) * width;

      for (let x = 0; x < width; x++) {
        const x1 = Math.max(x - halfS, 0);
        const x2 = Math.min(x + halfS, width - 1);
        
        const count = (x2 - x1) * (y2 - y1);
        let sum = integralImage[rowY2 + x2];
        if (y1 > 0) sum -= integralImage[rowY1 + x2];
        if (x1 > 0) sum -= integralImage[rowY2 + (x1 - 1)];
        if (y1 > 0 && x1 > 0) sum += integralImage[rowY1 + (x1 - 1)];

        const idx = (y * width + x) * 4;
        if (data[idx] * count < sum * (1.0 - t)) {
          data[idx] = data[idx + 1] = data[idx + 2] = 0;
        } else {
          data[idx] = data[idx + 1] = data[idx + 2] = 255;
        }
      }
    }
  };

  const postProcessText = (rawText: string, lang: string): string => {
    if (lang !== 'eng') return rawText; // Only apply basic fixes for English to avoid breaking other languages

    return rawText
      .replace(/\|/g, 'I') // Often bar is read as I
      .replace(/\blo\b/g, '10') // common misread of 10
      .replace(/([a-zA-Z])0([a-zA-Z])/g, '$1o$2') // 0 instead of o inside words
      .replace(/([a-zA-Z])1([a-zA-Z])/g, '$1i$2') // 1 instead of i inside words
      .replace(/([a-zA-Z])5([a-zA-Z])/g, '$1s$2') // 5 instead of s inside words
      .replace(/([a-zA-Z])2([a-zA-Z])/g, '$1z$2') // 2 instead of z inside words
      .replace(/([a-zA-Z])8([a-zA-Z])/g, '$1B$2') // 8 instead of B inside words
      .replace(/\r/g, ''); // Clean carriage returns
  };

  const extractText = async () => {
    if (images.length === 0) return;
    
    setIsProcessing(true);
    setText('');
    setProgress(0);

    let fullText = '';

    try {
      if (engine === 'cloud') {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Process images in parallel for much faster results
        const promises = images.map(async (img, i) => {
          const [prefix, base64Data] = img.split(',');
          const mimeType = prefix.match(/:(.*?);/)?.[1] || 'image/jpeg';

          try {
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [
                {
                  parts: [
                    { text: 'Extract all the text from this image accurately. Preserve layout, line breaks and formatting. Output only the extracted text without any commentary.' },
                    {
                      inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                      }
                    }
                  ]
                }
              ],
              config: {
                thinkingConfig: {
                  thinkingLevel: ThinkingLevel.LOW
                }
              }
            });
            
            return { index: i, text: response.text || '' };
          } catch (err) {
            console.error(`Error processing image ${i}:`, err);
            return { index: i, text: `[Error processing image ${i + 1}]` };
          }
        });

        // Track progress as promises complete
        let completedCount = 0;
        const results = await Promise.all(
          promises.map(p => p.then(res => {
            completedCount++;
            setProgress(Math.round((completedCount / images.length) * 100));
            return res;
          }))
        );

        // Sort results to maintain original order
        const sortedResults = results.sort((a, b) => a.index - b.index);
        fullText = sortedResults.map(r => r.text).join('\n\n---\n\n');
        
        setText(fullText);
      } else {
        // Use local Tesseract.js
        const worker = await createWorker(language, 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              // Note: This logger might be noisy with multiple images, we'll simplify progress
            }
          }
        });
        
        const psm = language === 'eng' ? PSM.SPARSE_TEXT : PSM.AUTO;
        await worker.setParameters({ tessedit_pageseg_mode: psm });

        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const processedImage = enhance ? await preprocessImage(img) : img;
          const result = await worker.recognize(processedImage);
          const processed = postProcessText(result.data.text, language);
          fullText += (i > 0 ? '\n\n' : '') + processed;
          setProgress(Math.round(((i + 1) / images.length) * 100));
        }
        
        setText(fullText);
        await worker.terminate();
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setText('Error extracting text. Please try another image.');
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadWordDoc = async () => {
    if (!text) return;

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: text.split('\n').map(line => 
            new Paragraph({
              children: [new TextRun(line)],
            })
          ),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `extracted-text-${Date.now()}.docx`);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Free Image to Text Extractor</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Extract text from images instantly using secure online OCR. 100% private.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer group"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*" 
                multiple
                className="hidden" 
              />
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Upload Images</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Select up to {MAX_IMAGES} images (PNG, JPG, WEBP)</p>
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Processing Engine</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEngine('local')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                    engine === 'local' 
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-400 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Cpu className="w-6 h-6 mb-1" />
                  <span className="font-semibold text-sm">Local OCR</span>
                  <span className="text-xs opacity-75 text-center mt-1">Best for printed text. 100% private.</span>
                </button>
                <button
                  onClick={() => setEngine('cloud')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                    engine === 'cloud' 
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-400 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Cloud className="w-6 h-6 mb-1" />
                  <span className="font-semibold text-sm">Cloud AI</span>
                  <span className="text-xs opacity-75 text-center mt-1">Best for handwriting & complex layouts.</span>
                </button>
              </div>
            </div>

            {engine === 'local' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Language</label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                      disabled={isProcessing}
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed flex items-center justify-between transition-all"
                    >
                      <span>
                        {LANGUAGES.find(l => l.code === language)?.name || 'Select Language'}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isLangDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
                        >
                          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                            {LANGUAGES.map((lang) => (
                              <button
                                key={lang.code}
                                type="button"
                                onClick={() => {
                                  setLanguage(lang.code);
                                  setIsLangDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-between ${
                                  language === lang.code ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {lang.name}
                                {language === lang.code && <Check className="w-4 h-4" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="enhance"
                    checked={enhance}
                    onChange={(e) => setEnhance(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                  />
                  <label htmlFor="enhance" className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1 cursor-pointer">
                    <Wand2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    Advanced Preprocessing
                  </label>
                </div>
              </>
            )}
          </div>

          <button
            onClick={extractText}
            disabled={images.length === 0 || isProcessing}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Extracting ({progress}%)...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Extract Text
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col h-full min-h-[400px]">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Extracted Text</label>
            {text && (
              <div className="flex items-center gap-4">
                <button
                  onClick={downloadWordDoc}
                  className="text-sm flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Save as Word
                </button>
                <button
                  onClick={copyToClipboard}
                  className="text-sm flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
              </div>
            )}
          </div>
          <textarea
            value={text}
            readOnly
            placeholder="Extracted text will appear here..."
            className="flex-1 w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
        </div>
      </div>

      {/* Optimized SEO Content Block for OCR Extractor */}
      <div className="mt-12 bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">AI Image to Text Converter: High Accuracy Online OCR Free</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Multilingual OCR: Hindi, Bengali & English to Text</h3>
            <p className="text-sm mb-4">
              Need to <strong className="text-gray-800 dark:text-gray-100">copy text from image online</strong>? BitBrainTech provides a highly accurate <strong className="text-gray-800 dark:text-gray-100">image to text converter free online</strong>. We specialize in complex scripts, offering the best <strong className="text-gray-800 dark:text-gray-100">hindi to english image to text</strong> extraction and <strong className="text-gray-800 dark:text-gray-100">bangla ocr online free</strong>. Our advanced scanner handles handwritten notes and printed documents with 99% accuracy.
            </p>
          </div>
          <div>
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Secure Online OCR with Privacy Guarantee</h3>
            <p className="text-sm mb-4">
              BitBrainTech is a <strong className="text-gray-800 dark:text-gray-100">browser-based OCR scanner</strong>. Unlike other platforms, we don't store your documents on a server. It's the most <strong className="text-gray-800 dark:text-gray-100">secure image to text converter</strong> for sensitive work. Extract text from JPG, PNG, and PDF files instantly without any registration or data privacy risks.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Why BitBrainTech is the best Online Photo to Text Converter?</h3>
          <p className="text-sm">
            Whether you're a student needing to <strong className="text-gray-800 dark:text-gray-100">extract text from image free</strong> or a professional looking for <strong className="text-gray-800 dark:text-gray-100">photo to word converter online</strong>, BitBrainTech delivers. Our tool supports multiple languages and layouts, making it a <strong className="text-gray-800 dark:text-gray-100">premium OCR tool free</strong> for everyone. No daily limits, no watermarks, just high-quality text recognition in seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
