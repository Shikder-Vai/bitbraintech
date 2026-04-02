import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, Download, Loader2, Settings } from 'lucide-react';

export default function ImageConverter() {
  const [image, setImage] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState<string>('image');
  const [targetFormat, setTargetFormat] = useState<string>('image/jpeg');
  const [quality, setQuality] = useState<number>(0.9);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatMap: Record<string, string> = {
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WEBP',
    'image/gif': 'GIF',
  };

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Save original name without extension
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setOriginalName(nameWithoutExt);
      
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setOutputImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const convertImage = async () => {
    if (!image) return;
    setIsProcessing(true);

    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // If converting to JPEG, fill with white background first (in case of transparent PNGs)
        if (targetFormat === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL(targetFormat, quality);
        setOutputImage(dataUrl);
        setIsProcessing(false);
      };
      img.src = image;
    }, 100);
  };

  const downloadImage = () => {
    if (!outputImage) return;
    const ext = extMap[targetFormat];
    const link = document.createElement('a');
    link.download = `${originalName}-converted.${ext}`;
    link.href = outputImage;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <ImageIcon className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Image Converter</h2>
          <p className="text-gray-500 text-sm mt-1">Convert images between PNG, JPG, and WEBP formats locally.</p>
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
                <p className="text-sm text-gray-500">PNG, JPG, WEBP, GIF</p>
              </div>
            )}
          </div>

          {image && (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Conversion Settings
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Format</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(formatMap).map(([mime, label]) => (
                    <button
                      key={mime}
                      onClick={() => setTargetFormat(mime)}
                      className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                        targetFormat === mime
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {targetFormat !== 'image/png' && targetFormat !== 'image/gif' && (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Quality</label>
                    <span className="text-sm text-gray-500">{Math.round(quality * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1" 
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <p className="text-xs text-gray-500 mt-2">Lower quality reduces file size but may introduce artifacts.</p>
                </div>
              )}

              <button
                onClick={convertImage}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    Convert Image
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div>
          {outputImage ? (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 h-full flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-4">Converted Result</h3>
              <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <img src={outputImage} alt="Converted" className="max-h-64 object-contain" />
              </div>
              <button
                onClick={downloadImage}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download {formatMap[targetFormat]}
              </button>
            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 bg-gray-50/50 min-h-[300px]">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Converted image will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Optimized SEO Content Block for Image Converter */}
      <div className="mt-12 bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Free Image Converter Online: JPG, PNG, WEBP & GIF</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Convert JPG to PNG Free Online</h3>
            <p className="text-sm mb-4">
              Need a reliable <strong className="text-gray-800">jpg to png converter free online</strong>? Our tool handles all your image conversion needs instantly. Whether you're looking for a <strong className="text-gray-800">png to jpg converter</strong> or want to <strong className="text-gray-800">convert image to webp</strong> for better web performance, BitBrainTech provides high-quality results with adjustable compression settings.
            </p>
          </div>
          <div>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Secure & Private Image Format Converter</h3>
            <p className="text-sm mb-4">
              Our <strong className="text-gray-800">free img converter online</strong> works entirely in your browser. This means your private photos are never uploaded to a server, ensuring <strong className="text-gray-800">100% private image conversion</strong>. It's a perfect <strong className="text-gray-800">batch image converter</strong> alternative for users who value their data security and need fast, local processing.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-md font-semibold text-gray-800 mb-2">Why Use Our Online Image Converter?</h3>
          <p className="text-sm">
            BitBrainTech offers a versatile <strong className="text-gray-800">image converter</strong> that supports all popular formats including JPG, PNG, WEBP, and GIF. Use our <strong className="text-gray-800">image quality compressor</strong> to reduce file size without significant loss in clarity. It's the ultimate <strong className="text-gray-800">free online image toolkit</strong> for designers, developers, and casual users who need quick and secure file transformations.
          </p>
        </div>
      </div>
    </div>
  );
}
