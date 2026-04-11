import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileText, Plus, Scissors, Image as ImageIcon, Download, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PdfTools() {
  const [mode, setMode] = useState<'merge' | 'split' | 'img2pdf'>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
      setError(null);
      setSuccess(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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
    try {
      const file = files[0];
      const pdfBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const pageCount = pdf.getPageCount();
      
      // For simplicity, we'll just extract each page as a separate file or just the first 5
      // Here we'll just extract all pages into one new PDF as a demo of "processing"
      // In a real app, you'd let user pick ranges.
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, [0]); // Extract first page
      newPdf.addPage(copiedPages[0]);
      
      const outBytes = await newPdf.save();
      downloadFile(outBytes, 'extracted_page_1.pdf', 'application/pdf');
      setSuccess('First page extracted successfully!');
    } catch (err) {
      setError('Failed to split PDF.');
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
        <h2 className="text-3xl font-bold text-gray-900">PDF Toolkit</h2>
        <p className="text-gray-500">Secure, browser-based PDF processing. No files ever leave your device.</p>
      </div>

      <div className="flex justify-center gap-2 p-1 bg-gray-100 rounded-xl w-fit mx-auto">
        <button 
          onClick={() => { setMode('merge'); setFiles([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'merge' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <Plus className="w-4 h-4 inline-block mr-1" /> Merge
        </button>
        <button 
          onClick={() => { setMode('split'); setFiles([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'split' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <Scissors className="w-4 h-4 inline-block mr-1" /> Split
        </button>
        <button 
          onClick={() => { setMode('img2pdf'); setFiles([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'img2pdf' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <ImageIcon className="w-4 h-4 inline-block mr-1" /> Image to PDF
        </button>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 hover:bg-gray-100 transition-colors relative">
            <input 
              type="file" 
              multiple={mode !== 'split'} 
              accept={mode === 'img2pdf' ? "image/png, image/jpeg" : "application/pdf"}
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={processing}
            />
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">
              {mode === 'img2pdf' ? 'Select Images (PNG/JPG)' : 'Select PDF Files'}
            </p>
            <p className="text-xs text-gray-500 mt-1">or drag and drop them here</p>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Selected Files</h3>
              <div className="grid gap-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
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
                  {mode === 'merge' ? 'Merge PDFs' : mode === 'split' ? 'Extract First Page' : 'Convert to PDF'}
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {success}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-2">100% Private</h4>
          <p className="text-sm text-gray-500">Files are processed locally in your browser. We never see your data.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-2">Fast & Free</h4>
          <p className="text-sm text-gray-500">No wait times, no subscriptions, no watermarks. Just pure utility.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-2">No Limits</h4>
          <p className="text-sm text-gray-500">Process as many files as you want. Your hardware is the only limit.</p>
        </div>
      </div>
    </div>
  );
}
