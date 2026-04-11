import React from 'react';
import { ShieldCheck, Cpu, Lock, Zap, Image, QrCode, FileText, Hash, Sparkles, FileAudio, FileOutput } from 'lucide-react';

export default function HowItWorks() {
  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">How BitBrainTech Works</h2>
      
      <div className="space-y-8">
        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <Lock className="w-5 h-5 text-blue-600" />
            100% Private, Local Video Processing in Browser
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Unlike most online tools, BitBrainTech is a <strong className="text-gray-800">secure video editor</strong> that processes your files entirely within your web browser. 
            As a <strong className="text-gray-800">no server upload video editor</strong>, your data never leaves your device. We use WebAssembly to run 
            FFmpeg directly on your machine, ensuring <strong className="text-gray-800">100% private video editing</strong> and file conversion.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <Cpu className="w-5 h-5 text-blue-600" />
            Alter Video Digital Footprint & Metadata
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Automated copyright detection systems (like Content ID) rely on cryptographic hashes, audio fingerprinting, and visual matching. 
            As a <strong className="text-gray-800">free video metadata editor</strong>, our tool allows you to <strong className="text-gray-800">remove video metadata</strong> and apply a combination of transformations. 
            This helps <strong className="text-gray-800">alter the video digital footprint</strong>, making it harder for automated systems to flag it as an exact match, effectively helping to <strong className="text-gray-800">bypass automated copyright detection</strong>.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <Zap className="w-5 h-5 text-blue-600" />
            Video Transformations
          </h3>
          <ul className="list-disc pl-5 space-y-3 text-gray-600">
            <li><strong className="text-gray-800">Mirroring:</strong> Flips the video horizontally, defeating simple spatial visual matching.</li>
            <li><strong className="text-gray-800">Speed & Pitch:</strong> Slightly altering the playback speed and audio pitch changes the audio fingerprint and video duration.</li>
            <li><strong className="text-gray-800">Color Grading:</strong> Adjusting saturation, contrast, or applying filters changes the pixel-level color data.</li>
            <li><strong className="text-gray-800">Safety Border:</strong> Adding a border changes the overall resolution and framing of the video.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <Image className="w-5 h-5 text-blue-600" />
            Free Image Upscaler & Converter
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Beyond video editing, BitBrainTech offers a <strong className="text-gray-800">free image upscaler</strong> to enhance your low-resolution photos without losing quality. 
            You can also use our <strong className="text-gray-800">free img converter online</strong> to seamlessly switch between formats. Whether you need a <strong className="text-gray-800">jpg to png converter free online</strong>, or want to convert WEBP and GIF files, our <strong className="text-gray-800">image converter</strong> handles it all locally on your device for maximum privacy and speed.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <FileText className="w-5 h-5 text-blue-600" />
            Image to Text & QR Code Tools
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Need to extract text from a picture? Our <strong className="text-gray-800">image to text converter</strong> uses local OCR technology to securely read your documents. It functions as a highly accurate <strong className="text-gray-800">photo to text scanner</strong> and <strong className="text-gray-800">free online OCR tool</strong>. 
            Additionally, our built-in <strong className="text-gray-800">QR code generator</strong> lets you create custom barcodes and QR codes instantly without tracking or server pings.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <Hash className="w-5 h-5 text-blue-600" />
            Unique Video Hash Generator & Scrubber
          </h3>
          <p className="text-gray-600 leading-relaxed">
            If you are looking to <strong className="text-gray-800">avoid copyright strikes on YouTube</strong> or figure out <strong className="text-gray-800">how to bypass copyright on TikTok</strong>, our <strong className="text-gray-800">video uniqueifier</strong> is the perfect solution. By tweaking the visual and audio data, BitBrainTech acts as a <strong className="text-gray-800">unique video hash generator</strong>. It effectively <strong className="text-gray-800">changes the video MD5 hash</strong> and serves as a comprehensive <strong className="text-gray-800">video metadata scrubber online</strong>, ensuring your content appears brand new to automated algorithms.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI Image Upscaler & Picture to Text
          </h3>
          <p className="text-gray-600 leading-relaxed">
            We also provide an <strong className="text-gray-800">AI image upscaler free</strong> of charge, allowing you to <strong className="text-gray-800">enhance image resolution online</strong> without any quality loss. Need to digitize documents? Use our <strong className="text-gray-800">picture to text converter</strong> to <strong className="text-gray-800">extract text from image free</strong>. Best of all, everything is processed as a <strong className="text-gray-800">no watermark video editor free</strong> and image toolkit, giving you professional results instantly.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <FileOutput className="w-5 h-5 text-blue-600" />
            PDF Toolkit: Merge, Split & Convert
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Managing documents is easier with our <strong className="text-gray-800">free PDF toolkit</strong>. You can <strong className="text-gray-800">merge PDF files online</strong>, split large documents, or convert your photos into a single PDF. Like all our tools, this happens entirely in your browser, making it a <strong className="text-gray-800">secure PDF editor</strong> that protects your sensitive information from server-side leaks.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <FileAudio className="w-5 h-5 text-blue-600" />
            Audio Extractor: Video to MP3
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Need to turn a video into a podcast or ringtone? Our <strong className="text-gray-800">audio extractor</strong> lets you <strong className="text-gray-800">convert video to MP3 free</strong>. It uses high-quality encoding to ensure your audio sounds crisp. This <strong className="text-gray-800">online video to audio converter</strong> is fast, reliable, and 100% private.
          </p>
        </section>
      </div>

      {/* SEO Content Block */}
      <div className="mt-12 bg-gray-50 p-6 rounded-xl border border-gray-200 text-gray-600 text-sm leading-relaxed">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Comprehensive Digital Toolkit</h3>
        <p className="mb-3">
          BitBrainTech is your ultimate destination for a <strong className="text-gray-800">free video metadata editor</strong>, <strong className="text-gray-800">image converter</strong>, and <strong className="text-gray-800">QR code generator</strong>. Whether you're trying to <strong className="text-gray-800">avoid copyright strikes on YouTube</strong>, learn <strong className="text-gray-800">how to bypass copyright on TikTok</strong>, or simply need a <strong className="text-gray-800">free image upscaler</strong>, our tools are designed for maximum privacy and efficiency.
        </p>
        <p>
          Experience the power of a <strong className="text-gray-800">video uniqueifier</strong> that <strong className="text-gray-800">changes the video MD5 hash</strong> and acts as a <strong className="text-gray-800">video metadata scrubber online</strong>. Digitize documents with our <strong className="text-gray-800">picture to text converter</strong> and <strong className="text-gray-800">extract text from image free</strong>. All features, including our <strong className="text-gray-800">free img converter online</strong> and <strong className="text-gray-800">jpg to png converter free online</strong>, are available as a <strong className="text-gray-800">no watermark video editor free</strong> of charge.
        </p>
      </div>
    </div>
  );
}
