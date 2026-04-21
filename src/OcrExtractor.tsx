import React, { useState, useRef } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { FileText, Upload, Copy, Check, Loader2, Wand2, Download, Cloud, Cpu } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export default function OcrExtractor() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enhance, setEnhance] = useState(true);
  const [language, setLanguage] = useState<string>('eng');
  const [engine, setEngine] = useState<'local' | 'cloud'>('local');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const LANGUAGES = [
    { code: 'eng', name: 'English' },
    { code: 'ben', name: 'Bengali' },
    { code: 'hin', name: 'Hindi' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
    { code: 'deu', name: 'German' },
    { code: 'ara', name: 'Arabic' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'rus', name: 'Russian' },
    { code: 'jpn', name: 'Japanese' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setText('');
        setProgress(0);
      };
      reader.readAsDataURL(file);
    }
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

  const extractText = async () => {
    if (!image) return;
    
    setIsProcessing(true);
    setText('');
    setProgress(0);

    try {
      if (engine === 'cloud') {
        // Use Gemini AI for handwriting and complex layouts
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Extract base64 and mimeType from data URL
        const [prefix, base64Data] = image.split(',');
        const mimeType = prefix.match(/:(.*?);/)?.[1] || 'image/jpeg';

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              parts: [
                { text: 'Extract all the text from this image exactly as it is written. Preserve the language, line breaks, and formatting. Do not add any markdown formatting like ``` or extra commentary. This may contain handwriting, read it carefully.' },
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                  }
                }
              ]
            }
          ]
        });
        
        setText(response.text || '');
        setProgress(100);
      } else {
        // Use local Tesseract.js
        const processedImage = enhance ? await preprocessImage(image) : image;

        const worker = await createWorker(language, 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        });
        
        // For non-English languages, standard page segmentation mode (3) usually works better
        // than sparse text mode (11) which is better for logos.
        const psm = language === 'eng' ? PSM.SPARSE_TEXT : PSM.AUTO;
        
        await worker.setParameters({
          tessedit_pageseg_mode: psm,
        });
        
        const result = await worker.recognize(processedImage);
        setText(result.data.text);
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
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Image to Text Extractor</h2>
          <p className="text-gray-500 text-sm mt-1">Extract text from images instantly using local OCR. 100% private.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 hover:border-blue-500 transition-colors cursor-pointer group"
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*" 
              className="hidden" 
            />
            {image ? (
              <img src={image} alt="Preview" className="max-h-64 mx-auto rounded-lg object-contain" />
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Upload Image</h3>
                <p className="text-sm text-gray-500">PNG, JPG, WEBP up to 10MB</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Processing Engine</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEngine('local')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                    engine === 'local' 
                      ? 'border-blue-600 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-blue-300 text-gray-600'
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
                      ? 'border-purple-600 bg-purple-50 text-purple-700' 
                      : 'border-gray-200 hover:border-purple-300 text-gray-600'
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
                  <label className="text-sm font-medium text-gray-700">Select Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isProcessing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="enhance"
                    checked={enhance}
                    onChange={(e) => setEnhance(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="enhance" className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer">
                    <Wand2 className="w-4 h-4 text-gray-500" />
                    Advanced Preprocessing (Adaptive Thresholding, De-skewing & Scaling)
                  </label>
                </div>
              </>
            )}
          </div>

          <button
            onClick={extractText}
            disabled={!image || isProcessing}
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
            <label className="text-sm font-medium text-gray-700">Extracted Text</label>
            {text && (
              <div className="flex items-center gap-4">
                <button
                  onClick={downloadWordDoc}
                  className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Save as Word
                </button>
                <button
                  onClick={copyToClipboard}
                  className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
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
            className="flex-1 w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-gray-50"
          />
        </div>
      </div>

      {/* Optimized SEO Content Block for OCR Extractor */}
      <div className="mt-12 bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Highly Accurate Image to Text Converter Online</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Free Online OCR Tool for Any Language</h3>
            <p className="text-sm mb-4">
              Our <strong className="text-gray-800">image to text converter</strong> is a powerful <strong className="text-gray-800">free online OCR tool</strong> that supports over 10 languages including English, Bengali, Hindi, and more. Whether you need to <strong className="text-gray-800">extract text from image free</strong> or convert a <strong className="text-gray-800">photo to text scanner</strong> result, our tool provides highly accurate results. It's the perfect <strong className="text-gray-800">jpg to word converter</strong> alternative for digitizing your documents.
            </p>
          </div>
          <div>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Advanced Handwriting to Text Converter</h3>
            <p className="text-sm mb-4">
              Struggling with messy notes? Our <strong className="text-gray-800">handwriting to text converter</strong> uses advanced Cloud AI to read and digitize handwritten documents with ease. For printed text, our <strong className="text-gray-800">local OCR software</strong> runs entirely in your browser, ensuring your sensitive documents are never uploaded to a server. It's a <strong className="text-gray-800">secure image to text</strong> solution for everyone.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-md font-semibold text-gray-800 mb-2">Why Use Our Picture to Text Converter?</h3>
          <p className="text-sm">
            BitBrainTech offers a comprehensive <strong className="text-gray-800">picture to text converter</strong> that is fast, free, and private. Use it as a <strong className="text-gray-800">png to text</strong> tool or to <strong className="text-gray-800">scan text from image</strong> instantly. You can easily copy the extracted text or download it as a Word document. With our <strong className="text-gray-800">free OCR online</strong> service, you get professional-grade results without the need for expensive software or subscriptions.
          </p>
        </div>
      </div>
    </div>
  );
}
