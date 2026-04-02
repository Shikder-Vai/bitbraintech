import React, { useState } from 'react';
import { Download, Link as LinkIcon, AlertCircle, Loader2, CheckCircle2, Info, Share2, Film, Music, Settings2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DownloadResult {
  status: 'stream' | 'redirect' | 'picker' | 'error';
  url?: string;
  filename?: string;
  text?: string;
  picker?: { type: string; url: string; quality?: string }[];
}

export default function UniversalDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState('720');

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, videoQuality: quality }),
      });

      const data = await response.json();

      if (data.status === 'error') {
        setError(data.text || 'Failed to fetch download link');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerDownload = (downloadUrl: string, filename: string = 'video.mp4') => {
    const proxyUrl = `/api/proxy-file?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(filename)}`;
    window.location.href = proxyUrl;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>Fast & Free Video Downloader</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Download Any Video <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              In Seconds
            </span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Save high-quality videos from YouTube, TikTok, Instagram, Twitter, and 50+ other platforms directly to your device. No watermarks, no registration required.
          </p>
        </motion.div>
      </div>

      {/* Main Downloader Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-3xl p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-16 relative overflow-hidden"
      >
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <form onSubmit={handleDownload} className="relative z-10">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste video URL here (e.g., https://youtube.com/watch?v=...)"
                required
                className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg shadow-sm"
              />
            </div>

            <div className="flex gap-4">
              <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <Settings2 className="w-5 h-5 text-gray-400 mr-2" />
                <select 
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="bg-transparent text-gray-700 font-medium focus:outline-none py-4 cursor-pointer appearance-none pr-4"
                >
                  <option value="max">Max Quality</option>
                  <option value="1080">1080p HD</option>
                  <option value="720">720p HD</option>
                  <option value="480">480p SD</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !url}
                className="min-w-[160px] bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-800 font-semibold mb-1">Download Failed</h4>
                  <p className="text-red-600 text-sm">{error}</p>
                  <p className="mt-2 text-red-500 text-xs font-medium">
                    Tip: Ensure the video is public. Private or age-restricted videos cannot be downloaded.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="p-8 bg-green-50 border border-green-100 rounded-2xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-full shrink-0">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-green-900 font-bold text-xl mb-1">Ready to Download!</h3>
                      <p className="text-green-700 text-sm">Your video has been successfully processed.</p>
                    </div>
                  </div>

                  {result.url && (
                    <button
                      onClick={() => triggerDownload(result.url!, result.filename)}
                      className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-green-600/20 active:scale-[0.98]"
                    >
                      <Download className="w-5 h-5" />
                      Download Video
                    </button>
                  )}
                </div>

                {result.picker && result.picker.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-green-200/50">
                    <h4 className="text-sm font-semibold text-green-800 mb-4 uppercase tracking-wider">Available Qualities</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {result.picker.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => triggerDownload(item.url, result.filename)}
                          className="bg-white hover:bg-green-100 border border-green-200 text-green-800 py-3 px-4 rounded-xl transition-all flex items-center justify-between group shadow-sm"
                        >
                          <span className="font-medium">{item.quality || 'Standard Quality'}</span>
                          <Download className="w-4 h-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <Film className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">High Quality 4K</h3>
          <p className="text-gray-600 leading-relaxed">
            Download videos in their original quality, up to 4K resolution when available. We never compress your downloads.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <Share2 className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">50+ Platforms</h3>
          <p className="text-gray-600 leading-relaxed">
            Support for all major social media platforms including YouTube, TikTok, Instagram, Twitter, Facebook, and Reddit.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="bg-purple-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Safe & Secure</h3>
          <p className="text-gray-600 leading-relaxed">
            No intrusive ads, no malware, and no tracking. Your downloads are processed securely and privately.
          </p>
        </motion.div>
      </div>

      {/* Info Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-gray-50 rounded-3xl p-8 md:p-12 border border-gray-200 text-center"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-8">
          Our advanced downloader uses a distributed network of APIs to fetch the best possible video source. Just paste the link, and we handle the rest.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-sm font-medium text-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">1</div>
            <span>Copy Video Link</span>
          </div>
          <ArrowRight className="hidden md:block w-5 h-5 text-gray-300" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">2</div>
            <span>Paste & Select Quality</span>
          </div>
          <ArrowRight className="hidden md:block w-5 h-5 text-gray-300" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">3</div>
            <span>Download Instantly</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
