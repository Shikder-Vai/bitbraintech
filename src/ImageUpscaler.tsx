import React, { useState, useRef } from 'react';
import { Maximize, Upload, Download, Loader2 } from 'lucide-react';

export default function ImageUpscaler() {
  const [image, setImage] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setOutputImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const upscaleImage = async () => {
    if (!image) return;
    setIsProcessing(true);

    // Use a small timeout to allow UI to update to processing state
    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Set new dimensions
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image scaled up
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Determine optimal export format to save space
        // PNGs get massive when upscaled, so we convert them to WebP (which supports transparency)
        // JPEGs stay as JPEGs with 90% quality
        const isPng = image.startsWith('data:image/png');
        const exportFormat = isPng ? 'image/webp' : 'image/jpeg';
        const quality = 0.90; // 90% quality is a great balance of size and clarity
        
        const dataUrl = canvas.toDataURL(exportFormat, quality);
        setOutputImage(dataUrl);
        setIsProcessing(false);
      };
      img.src = image;
    }, 100);
  };

  const downloadImage = () => {
    if (!outputImage) return;
    const isWebp = outputImage.startsWith('data:image/webp');
    const ext = isWebp ? 'webp' : 'jpg';
    const link = document.createElement('a');
    link.download = `upscaled-${scale}x-${Date.now()}.${ext}`;
    link.href = outputImage;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <Maximize className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Image Upscaler & Resizer</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Enhance image resolution locally using high-quality resampling.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer group"
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
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Upload Image</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">PNG, JPG, WEBP</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Scale Factor</label>
            <div className="flex gap-4">
              {[2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    scale === s ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-2 border-blue-500' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={upscaleImage}
            disabled={!image || isProcessing}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Maximize className="w-5 h-5" />
                Upscale Image
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col h-full min-h-[400px]">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Upscaled Result</label>
            {outputImage && (
              <button
                onClick={downloadImage}
                className="text-sm flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            )}
          </div>
          <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden p-4">
            {outputImage ? (
              <img src={outputImage} alt="Upscaled" className="max-h-full max-w-full object-contain rounded-lg shadow-sm" />
            ) : (
              <p className="text-gray-400 dark:text-gray-500 text-center">Processed image will appear here</p>
            )}
          </div>
        </div>
      </div>

      {/* Optimized SEO Content Block for Image Upscaler */}
      <div className="mt-12 bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">AI Image Upscaler: Enhance Resolution Online Free</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Upscale Image Free Without Quality Loss</h3>
            <p className="text-sm mb-4">
              Looking for a way to <strong className="text-gray-800 dark:text-gray-100">upscale image free</strong>? Our <strong className="text-gray-800 dark:text-gray-100">AI image upscaler</strong> uses advanced resampling algorithms to <strong className="text-gray-800 dark:text-gray-100">enhance image resolution online</strong> instantly. Whether you need to <strong className="text-gray-800 dark:text-gray-100">increase image size without losing quality</strong> or fix blurry photos, our tool provides professional-grade results. It's the perfect <strong className="text-gray-800 dark:text-gray-100">image enlarger online</strong> for your low-res pictures.
            </p>
          </div>
          <div>
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Secure & Private Photo Enhancer AI</h3>
            <p className="text-sm mb-4">
              Our <strong className="text-gray-800 dark:text-gray-100">photo enhancer AI</strong> runs entirely in your browser, ensuring your images are never uploaded to any server. This makes it a <strong className="text-gray-800 dark:text-gray-100">secure image upscaler</strong> for personal and professional use. From creating a <strong className="text-gray-800 dark:text-gray-100">4k image upscaler</strong> result to simply enlarging a small icon, BitBrainTech handles it all locally with maximum speed and privacy.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Why Use Our Free Image Upscaler?</h3>
          <p className="text-sm">
            BitBrainTech provides a powerful <strong className="text-gray-800 dark:text-gray-100">free image upscaler</strong> that is fast, reliable, and easy to use. It's a great <strong className="text-gray-800 dark:text-gray-100">waifu2x online alternative</strong> for upscaling anime art, photos, and graphics. With our <strong className="text-gray-800 dark:text-gray-100">high-quality image upscaler</strong>, you can transform your low-resolution images into crisp, clear visuals ready for print or high-res displays.
          </p>
        </div>
      </div>
    </div>
  );
}
