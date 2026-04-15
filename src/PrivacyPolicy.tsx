import React from 'react';
import { Shield, ServerOff, EyeOff, FileText } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
      </div>
      
      <div className="space-y-8 text-gray-600 leading-relaxed">
        <section>
          <p className="mb-4">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p>
            At BitBrainTech, your privacy is our absolute priority. Whether you are using our <strong className="text-gray-800">free video metadata editor</strong>, <strong className="text-gray-800">image to text converter</strong>, or <strong className="text-gray-800">QR code generator</strong>, we have designed this tool from the ground up to ensure that your data remains entirely in your control. This Privacy Policy outlines how we handle your information when you use our website.
          </p>
        </section>

        <section className="bg-blue-50 p-6 rounded-lg border border-blue-100">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-blue-900">
            <ServerOff className="w-5 h-5 text-blue-600" />
            Local-Only Processing (No Server Uploads)
          </h3>
          <p className="text-blue-800">
            <strong>We do not upload, store, or process your files on our servers.</strong> BitBrainTech operates as a <strong className="text-blue-900">secure local processing suite</strong>. Whether you are using our <strong className="text-blue-900">AI Background Remover</strong>, <strong className="text-blue-900">Video Metadata Editor</strong>, or <strong className="text-blue-900">Image Upscaler</strong>, all tasks are performed locally on your device using WebAssembly and On-Device AI. Once you close the tab, all processed data is immediately destroyed from your device's temporary memory, ensuring <strong className="text-blue-900">100% private processing</strong>.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <EyeOff className="w-5 h-5 text-blue-600" />
            Information We Do Not Collect
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>We do not collect personal identification information (Name, Email, etc.) as there are no user accounts required to <strong className="text-gray-800">remove video metadata</strong> or <strong className="text-gray-800">bypass automated copyright detection</strong>.</li>
            <li>We do not collect, view, or analyze the contents of the videos, images, or documents you process.</li>
            <li>We do not track your IP address or associate it with the files you process.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-900">
            <FileText className="w-5 h-5 text-blue-600" />
            Analytics and Cookies
          </h3>
          <p>
            We may use basic, privacy-respecting analytics to understand general website traffic (such as page views). We do not use tracking cookies or third-party advertising trackers that monitor your behavior across the web.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Changes to This Policy</h3>
          <p>
            We may update our Privacy Policy from time to time. Any changes will be reflected on this page with an updated revision date. Because we do not collect user contact information, we cannot notify you directly of changes, so we encourage you to review this policy periodically.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Contact Us</h3>
          <p>
            If you have any questions or concerns about this Privacy Policy or how your data is handled, please feel free to reach out to us at:
          </p>
          <p className="mt-2">
            <a href="mailto:mdnurujjaman987@gmail.com" className="text-blue-600 hover:underline font-medium">
              mdnurujjaman987@gmail.com
            </a>
          </p>
        </section>
      </div>

      {/* SEO Content Block */}
      <div className="mt-12 bg-gray-50 p-6 rounded-xl border border-gray-200 text-gray-600 text-sm leading-relaxed">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Privacy is Our Priority</h3>
        <p className="mb-3">
          At BitBrainTech, we believe in providing powerful tools like our <strong className="text-gray-800">free video metadata editor</strong>, <strong className="text-gray-800">image converter</strong>, and <strong className="text-gray-800">QR code generator</strong> without compromising your data. Whether you're using our <strong className="text-gray-800">video uniqueifier</strong> to <strong className="text-gray-800">avoid copyright strikes on YouTube</strong> or our <strong className="text-gray-800">free image upscaler</strong>, your files are processed locally.
        </p>
        <p>
          We are committed to being a <strong className="text-gray-800">no watermark video editor free</strong> of tracking and server uploads. From our <strong className="text-gray-800">picture to text converter</strong> to our <strong className="text-gray-800">video metadata scrubber online</strong>, every feature is designed to <strong className="text-gray-800">extract text from image free</strong> and securely, ensuring you can <strong className="text-gray-800">bypass automated copyright detection</strong> with peace of mind.
        </p>
      </div>
    </div>
  );
}
