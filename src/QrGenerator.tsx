import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { QrCode, Download, Type } from 'lucide-react';

export default function QrGenerator() {
  const [text, setText] = useState('https://bitbraintech.online');
  const [type, setType] = useState<'qr' | 'barcode'>('qr');
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDownload = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Add padding and white background
      const padding = 20;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2;
      
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${type}-${Date.now()}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">QR & Barcode Generator</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter Text or URL
          </label>
          <div className="relative">
            <Type className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[120px] resize-y"
              placeholder="e.g., https://example.com or 123456789"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setType('qr')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              type === 'qr' ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            QR Code
          </button>
          <button
            onClick={() => setType('barcode')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              type === 'barcode' ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            Barcode
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] border border-gray-200">
          {text ? (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              {type === 'qr' ? (
                <QRCodeSVG
                  ref={svgRef}
                  value={text}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div ref={svgRef as any}>
                  <Barcode value={text} format="CODE128" />
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-center">Enter some text to generate</p>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={!text}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-5 h-5" />
          Download as PNG
        </button>
      </div>

      {/* Optimized SEO Content Block for QR Generator */}
      <div className="mt-12 bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-gray-600 leading-relaxed">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Fast, Private & Free QR Code Generator Online</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Create Custom QR Codes for Any Use</h3>
            <p className="text-sm mb-4">
              Our <strong className="text-gray-800">free QR code generator</strong> is the ultimate tool for creating scannable codes for your website, social media, or business. Whether you need a <strong className="text-gray-800">QR code for URL</strong>, contact information, or a WiFi password, our <strong className="text-gray-800">custom QR code maker</strong> provides high-resolution results instantly. Unlike other tools, we don't track your scans or add annoying watermarks.
            </p>
          </div>
          <div>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Professional Barcode Maker Online</h3>
            <p className="text-sm mb-4">
              Need to <strong className="text-gray-800">create barcode online</strong> for your products or inventory? Our built-in <strong className="text-gray-800">barcode generator free</strong> of charge supports standard formats like CODE128. It's a perfect solution for small businesses looking for a <strong className="text-gray-800">secure barcode maker</strong> that works entirely offline in the browser, ensuring your sensitive data never leaves your device.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="text-md font-semibold text-gray-800 mb-2">Why Choose Our Secure QR Generator?</h3>
          <p className="text-sm">
            Most <strong className="text-gray-800">online QR code generators</strong> store your data on their servers and track your users. BitBrainTech is different. We offer a <strong className="text-gray-800">privacy-first QR code maker</strong> that generates codes locally. This means no server pings, no tracking, and <strong className="text-gray-800">no expiry QR codes</strong>. Use our <strong className="text-gray-800">bulk QR code generator</strong> alternative to create and download your codes as high-quality PNG images for print or digital use.
          </p>
        </div>
      </div>
    </div>
  );
}
