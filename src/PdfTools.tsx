import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileText, Plus, Scissors, Image as ImageIcon, Download, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PdfTools() {
  const [mode, setMode] = useState<'merge' | 'split' | 'img2pdf'>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [splitRange, setSplitRange] = useState<string>('');
  const [splitOption, setSplitOption] = useState<'all' | 'range'>('all');
  const [totalPages, setTotalPages] = useState<number>(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (selectedFiles.length > 0) {
      if (mode === 'split') {
        const file = selectedFiles[0];
        setFiles([file]);
        try {
          const bytes = await file.arrayBuffer();
          const pdf = await PDFDocument.load(bytes);
          setTotalPages(pdf.getPageCount());
          setSplitRange(`1-${pdf.getPageCount()}`);
        } catch (err) {
          setError('Failed to read PDF pages.');
        }
      } else {
        setFiles(prev => [...prev, ...selectedFiles]);
      }
      setError(null);
      setSuccess(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (mode === 'split') setTotalPages(0);
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      setError('Please select at least 2 PDF files to merge.');
      return;
    }
    setProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const pdfBytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      downloadFile(pdfBytes, 'merged_document.pdf', 'application/pdf');
      setSuccess('PDFs merged successfully!');
    } catch (err) {
      setError('Failed to merge PDFs. Ensure all files are valid PDF documents.');
    } finally {
      setProcessing(false);
    }
  };

  const splitPdf = async () => {
    if (files.length === 0) {
      setError('Please select a PDF file to split.');
      return;
    }
    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const file = files[0];
      const pdfBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const count = pdf.getPageCount();
      
      if (splitOption === 'range') {
        // Parse range: e.g., "1, 3, 5-7"
        const pagesToExtract: number[] = [];
        const parts = splitRange.split(',').map(p => p.trim());
        
        for (const part of parts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n));
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = start; i <= end; i++) {
                if (i >= 1 && i <= count) pagesToExtract.push(i - 1);
              }
            }
          } else {
            const pageNum = parseInt(part);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= count) {
              pagesToExtract.push(pageNum - 1);
            }
          }
        }

        if (pagesToExtract.length === 0) {
          throw new Error('No valid pages found in range.');
        }

        const newPdf = await PDFDocument.create();
        const uniquePages = Array.from(new Set(pagesToExtract)).sort((a, b) => a - b);
        const copiedPages = await newPdf.copyPages(pdf, uniquePages);
        copiedPages.forEach(p => newPdf.addPage(p));
        
        const outBytes = await newPdf.save();
        downloadFile(outBytes, `extracted_pages_${Date.now()}.pdf`, 'application/pdf');
        setSuccess(`Successfully extracted ${uniquePages.length} pages.`);
      } else {
        // Split all pages into individual files
        // Note: multiple downloads might be blocked by some browsers
        for (let i = 0; i < count; i++) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(pdf, [i]);
          newPdf.addPage(copiedPage);
          const outBytes = await newPdf.save();
          downloadFile(outBytes, `${file.name.replace('.pdf', '')}_page_${i + 1}.pdf`, 'application/pdf');
          
          // Small delay to help browser handle multiple downloads
          if (count > 1) await new Promise(r => setTimeout(r, 100));
        }
        setSuccess(`Successfully split into ${count} individual files.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to split PDF. Please check the range format.');
    } finally {
      setProcessing(false);
    }
  };

  const imgToPdf = async () => {
    if (files.length === 0) {
      setError('Please select at least one image.');
      return;
    }
    setProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      for (const file of files) {
        const imgBytes = await file.arrayBuffer();
        let img;
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          img = await pdfDoc.embedJpg(imgBytes);
        } else if (file.type === 'image/png') {
          img = await pdfDoc.embedPng(imgBytes);
        } else {
          continue;
        }
        const page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const pdfBytes = await pdfDoc.save();
      downloadFile(pdfBytes, 'images_to_pdf.pdf', 'application/pdf');
      setSuccess('Images converted to PDF successfully!');
    } catch (err) {
      setError('Failed to convert images to PDF.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = (data: Uint8Array, name: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">PDF Toolkit</h2>
        <p className="text-gray-500 dark:text-gray-400">Secure, browser-based PDF processing. No files ever leave your device.</p>
      </div>

      <div className="flex justify-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mx-auto">
        <button 
          onClick={() => { setMode('merge'); setFiles([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'merge' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
        >
          <Plus className="w-4 h-4 inline-block mr-1" /> Merge
        </button>
        <button 
          onClick={() => { setMode('split'); setFiles([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'split' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
        >
          <Scissors className="w-4 h-4 inline-block mr-1" /> Split
        </button>
        <button 
          onClick={() => { setMode('img2pdf'); setFiles([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'img2pdf' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
        >
          <ImageIcon className="w-4 h-4 inline-block mr-1" /> Image to PDF
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
            <input 
              type="file" 
              multiple={mode !== 'split'} 
              accept={mode === 'img2pdf' ? "image/png, image/jpeg" : "application/pdf"}
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={processing}
            />
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              {mode === 'img2pdf' ? 'Select Images (PNG/JPG)' : 'Select PDF Files'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">or drag and drop them here</p>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Selected Files</h3>
              <div className="grid gap-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{file.name}</span>
                      <span className="text-xs text-gray-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button 
                      onClick={() => removeFile(i)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && mode === 'split' && (
            <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">Split Options</h3>
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md">
                  Total Pages: {totalPages}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSplitOption('all')}
                  className={`p-3 text-sm font-bold rounded-lg border-2 transition-all ${splitOption === 'all' ? 'border-blue-600 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'}`}
                >
                  Split All Pages
                  <span className="block text-[10px] font-normal opacity-70">Downloads each page separately</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSplitOption('range')}
                  className={`p-3 text-sm font-bold rounded-lg border-2 transition-all ${splitOption === 'range' ? 'border-blue-600 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'}`}
                >
                  Custom Range
                  <span className="block text-[10px] font-normal opacity-70">Extract specific pages</span>
                </button>
              </div>

              {splitOption === 'range' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-blue-800 dark:text-blue-300">Page Range (e.g., 1, 3, 5-10)</label>
                  <input
                    type="text"
                    value={splitRange}
                    onChange={(e) => setSplitRange(e.target.value)}
                    placeholder="Enter range..."
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-lg text-sm outline-none text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={mode === 'merge' ? mergePdfs : mode === 'split' ? splitPdf : imgToPdf}
              disabled={files.length === 0 || processing}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                files.length === 0 || processing ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.01]'
              }`}
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {mode === 'merge' ? 'Merge PDFs' : mode === 'split' ? (splitOption === 'all' ? 'Split into Pages' : 'Extract Range') : 'Convert to PDF'}
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl flex items-center gap-3 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {success}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">100% Private</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">Files are processed locally in your browser. We never see your data.</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Fast & Free</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">No wait times, no subscriptions, no watermarks. Just pure utility.</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">No Limits</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">Process as many files as you want. Your hardware is the only limit.</p>
        </div>
      </div>
    </div>
  );
}
