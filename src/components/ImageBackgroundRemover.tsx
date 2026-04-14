import * as React from 'react';
import { Upload, Image as ImageIcon, Download, Trash2, Loader2, Wand2, RefreshCw, Eraser, Paintbrush, Check, X, Undo2, Redo2 } from 'lucide-react';

export default function ImageBackgroundRemover() {
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [isModelLoading, setIsModelLoading] = React.useState(false);
  const [isLibraryLoaded, setIsLibraryLoaded] = React.useState(false);

  // Manual Refinement State
  const [isEditing, setIsEditing] = React.useState(false);
  const [brushSize, setBrushSize] = React.useState(30);
  const [brushMode, setBrushMode] = React.useState<'add' | 'remove'>('add');
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [mousePos, setMousePos] = React.useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = React.useState(false);
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  
  // Refs for high-performance rendering
  const zoomRef = React.useRef(1);
  const panOffsetRef = React.useRef({ x: 0, y: 0 });
  const removeBgRef = React.useRef<any>(null);
  const originalImgRef = React.useRef<HTMLImageElement | null>(null);
  const maskCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const tempCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const maskCtxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const undoStackRef = React.useRef<string[]>([]);
  const redoStackRef = React.useRef<string[]>([]);
  const lastPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const lastProgressUpdateRef = React.useRef<number>(0);

  const loadLibrary = async () => {
    try {
      setError(null);
      setIsModelLoading(true);
      // Using a more robust dynamic import
      const module = await import('@imgly/background-removal');
      removeBgRef.current = module.removeBackground || module.default || module;
      setIsLibraryLoaded(true);
      setIsModelLoading(false);
    } catch (err) {
      console.error('Failed to load background removal library:', err);
      setError('Failed to load the AI engine. This might be due to a slow connection or browser restrictions.');
      setIsModelLoading(false);
      setIsLibraryLoaded(false);
    }
  };

  React.useEffect(() => {
    loadLibrary();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isEditing) {
        setIsSpacePressed(true);
        if (!isPanMode) setIsPanMode(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEditing, isPanMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setError('Image size too large. Please upload an image under 15MB.');
        return;
      }
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      const img = new Image();
      img.src = url;
      img.onload = () => {
        originalImgRef.current = img;
      };

      setResultUrl(null);
      setError(null);
    }
  };

  const removeBackground = async () => {
    if (!selectedImage || !removeBgRef.current) {
      if (!removeBgRef.current) setError('AI engine not ready. Please try again in a moment.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Configuration for better compatibility
      const config = {
        progress: (stage: string, progress: number) => {
          // The library actually sends (stage, progress) or just fraction depending on version
          // Let's handle both
          let fraction = 0;
          if (typeof stage === 'number') {
            fraction = stage;
          } else if (typeof progress === 'number') {
            fraction = progress;
          }

          const now = Date.now();
          if (now - lastProgressUpdateRef.current > 100) { // Throttle to 10fps
            const percentage = Math.round(fraction * 100);
            if (!isNaN(percentage)) {
              setProgress(Math.min(100, Math.max(0, percentage)));
            }
            lastProgressUpdateRef.current = now;
          }
        },
        model: 'medium',
        output: {
          format: 'image/png',
          quality: 0.8,
          type: 'foreground'
        }
      };

      const resultBlob = await removeBgRef.current(selectedImage, config);

      const url = URL.createObjectURL(resultBlob);
      setResultUrl(url);
      setProgress(100);
    } catch (err) {
      console.error('Background removal failed:', err);
      setError('Background removal failed. Please try a different image or refresh the page.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setError(null);
    setProgress(0);
    setIsEditing(false);
    originalImgRef.current = null;
    undoStackRef.current = [];
    redoStackRef.current = [];
  };

  // --- Manual Refinement Logic ---

  const startEditing = async () => {
    if (!resultUrl || !originalImgRef.current) return;
    setIsEditing(true);
    
    // Initialize mask canvas
    const img = originalImgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load AI result to extract initial mask
    const resultImg = new Image();
    resultImg.src = resultUrl;
    await resultImg.decode();

    // Draw AI result
    ctx.drawImage(resultImg, 0, 0);
    
    // Convert to white mask (where alpha > 0)
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    maskCanvasRef.current = canvas;
    maskCtxRef.current = ctx;
    
    // Calculate initial zoom to fit image
    const editorArea = document.getElementById('editor-area');
    let initialScale = 0.8;
    if (editorArea) {
      const padding = 40;
      const availableWidth = editorArea.clientWidth - padding;
      const availableHeight = editorArea.clientHeight - padding;
      initialScale = Math.min(availableWidth / img.width, availableHeight / img.height, 1);
    }
    
    setZoom(initialScale);
    zoomRef.current = initialScale;
    setPanOffset({ x: 0, y: 0 });
    panOffsetRef.current = { x: 0, y: 0 };
    
    saveToUndoStack();
    requestAnimationFrame(updateDisplayCanvas);
  };

  const saveToUndoStack = () => {
    if (!maskCanvasRef.current) return;
    undoStackRef.current.push(maskCanvasRef.current.toDataURL());
    if (undoStackRef.current.length > 20) undoStackRef.current.shift();
    // Clear redo stack on new action
    redoStackRef.current = [];
    setCanUndo(undoStackRef.current.length > 1);
    setCanRedo(false);
  };

  const undo = () => {
    if (undoStackRef.current.length <= 1 || !maskCanvasRef.current) return;
    const currentState = undoStackRef.current.pop()!;
    redoStackRef.current.push(currentState);
    
    const prevState = undoStackRef.current[undoStackRef.current.length - 1];
    
    const img = new Image();
    img.src = prevState;
    img.onload = () => {
      const ctx = maskCtxRef.current;
      if (ctx && maskCanvasRef.current) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
        setCanUndo(undoStackRef.current.length > 1);
        setCanRedo(true);
        updateDisplayCanvas();
      }
    };
  };

  const redo = () => {
    if (redoStackRef.current.length === 0 || !maskCanvasRef.current) return;
    const nextState = redoStackRef.current.pop()!;
    undoStackRef.current.push(nextState);
    
    const img = new Image();
    img.src = nextState;
    img.onload = () => {
      const ctx = maskCtxRef.current;
      if (ctx && maskCanvasRef.current) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
        setCanUndo(true);
        setCanRedo(redoStackRef.current.length > 0);
        updateDisplayCanvas();
      }
    };
  };

  const updateDisplayCanvas = () => {
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const originalImg = originalImgRef.current;
    if (!displayCanvas || !maskCanvas || !originalImg) return;

    const ctx = displayCanvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    if (displayCanvas.width !== originalImg.width || displayCanvas.height !== originalImg.height) {
      displayCanvas.width = originalImg.width;
      displayCanvas.height = originalImg.height;
    }

    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.save();
    
    // Apply Pan and Zoom
    ctx.translate(displayCanvas.width / 2 + panOffset.x, displayCanvas.height / 2 + panOffset.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-displayCanvas.width / 2, -displayCanvas.height / 2);

    // 1. Draw Original Image reference (low opacity)
    ctx.globalAlpha = 0.3;
    ctx.drawImage(originalImg, 0, 0);
    ctx.globalAlpha = 1.0;

    // 2. Draw Red Mask Overlay (Optimized)
    if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement('canvas');
    const tempCanvas = tempCanvasRef.current;
    if (tempCanvas.width !== maskCanvas.width || tempCanvas.height !== maskCanvas.height) {
      tempCanvas.width = maskCanvas.width;
      tempCanvas.height = maskCanvas.height;
    }
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tCtx.fillStyle = '#ff0000';
      tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tCtx.globalCompositeOperation = 'destination-in';
      tCtx.drawImage(maskCanvas, 0, 0);
      
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
    }

    // 3. Draw Refined Result
    const resultCanvas = document.createElement('canvas'); // Keep this local for now as it's less frequent
    resultCanvas.width = originalImg.width;
    resultCanvas.height = originalImg.height;
    const rCtx = resultCanvas.getContext('2d');
    if (rCtx) {
      rCtx.drawImage(originalImg, 0, 0);
      rCtx.globalCompositeOperation = 'destination-in';
      rCtx.drawImage(maskCanvas, 0, 0);
      ctx.drawImage(resultCanvas, 0, 0);
    }
    
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;
    setMousePos({ x: mX, y: mY });

    if (!isDrawing) {
      requestAnimationFrame(updateDisplayCanvas);
      return;
    }

    if (isPanMode) {
      if (lastPosRef.current) {
        const dx = mX - lastPosRef.current.x;
        const dy = mY - lastPosRef.current.y;
        
        panOffsetRef.current = {
          x: panOffsetRef.current.x + dx,
          y: panOffsetRef.current.y + dy
        };
        setPanOffset(panOffsetRef.current);
        lastPosRef.current = { x: mX, y: mY };
        requestAnimationFrame(updateDisplayCanvas);
      }
      return;
    }

    if (!maskCanvasRef.current || !maskCtxRef.current) return;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentZoom = zoomRef.current;
    const currentPan = panOffsetRef.current;

    const x = ((mX * scaleX - canvas.width / 2 - currentPan.x) / currentZoom) + canvas.width / 2;
    const y = ((mY * scaleY - canvas.height / 2 - currentPan.y) / currentZoom) + canvas.height / 2;

    const mCtx = maskCtxRef.current;
    mCtx.lineWidth = (brushSize * scaleX) / currentZoom; 
    mCtx.lineCap = 'round';
    mCtx.lineJoin = 'round';
    mCtx.strokeStyle = 'white';
    mCtx.fillStyle = 'white';

    mCtx.globalCompositeOperation = brushMode === 'add' ? 'source-over' : 'destination-out';

    mCtx.beginPath();
    if (lastPosRef.current) {
      mCtx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      mCtx.lineTo(x, y);
      mCtx.stroke();
    } else {
      mCtx.arc(x, y, ((brushSize * scaleX) / currentZoom) / 2, 0, Math.PI * 2);
      mCtx.fill();
    }

    lastPosRef.current = { x, y };
    requestAnimationFrame(updateDisplayCanvas);
  };

  const startDrawing = (e: React.PointerEvent) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    
    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;

    if (isPanMode) {
      lastPosRef.current = { x: mX, y: mY };
      return;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentZoom = zoomRef.current;
    const currentPan = panOffsetRef.current;

    const x = ((mX * scaleX - canvas.width / 2 - currentPan.x) / currentZoom) + canvas.width / 2;
    const y = ((mY * scaleY - canvas.height / 2 - currentPan.y) / currentZoom) + canvas.height / 2;

    lastPosRef.current = { x, y };
    
    const mCtx = maskCtxRef.current;
    if (mCtx) {
      mCtx.globalCompositeOperation = brushMode === 'add' ? 'source-over' : 'destination-out';
      mCtx.fillStyle = 'white';
      mCtx.beginPath();
      mCtx.arc(x, y, ((brushSize * scaleX) / currentZoom) / 2, 0, Math.PI * 2);
      mCtx.fill();
      requestAnimationFrame(updateDisplayCanvas);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const oldZoom = zoomRef.current;
    const newZoom = Math.min(10, Math.max(0.1, oldZoom * delta));
    
    if (newZoom !== oldZoom) {
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      // Zoom towards mouse position
      const dx = (mX * scaleX - canvas.width / 2 - panOffsetRef.current.x) / oldZoom;
      const dy = (mY * scaleY - canvas.height / 2 - panOffsetRef.current.y) / oldZoom;
      
      panOffsetRef.current = {
        x: mX * scaleX - canvas.width / 2 - dx * newZoom,
        y: mY * scaleY - canvas.height / 2 - dy * newZoom
      };
      
      zoomRef.current = newZoom;
      setZoom(newZoom);
      setPanOffset(panOffsetRef.current);
      requestAnimationFrame(updateDisplayCanvas);
    }
  };

  const stopDrawing = (e: React.PointerEvent) => {
    const canvas = displayCanvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
    
    setIsDrawing(false);
    lastPosRef.current = null;
    saveToUndoStack();
  };

  const finishEditing = () => {
    if (!maskCanvasRef.current || !originalImgRef.current) return;
    
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = originalImgRef.current.width;
    finalCanvas.height = originalImgRef.current.height;
    const fCtx = finalCanvas.getContext('2d');
    if (!fCtx) return;

    fCtx.drawImage(originalImgRef.current, 0, 0);
    fCtx.globalCompositeOperation = 'destination-in';
    fCtx.drawImage(maskCanvasRef.current, 0, 0);

    setResultUrl(finalCanvas.toDataURL('image/png'));
    setIsEditing(false);
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `no-bg-${selectedImage?.name.split('.')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Professional AI Background Remover
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Remove backgrounds with professional precision using advanced AI. 
          100% private, runs entirely in your browser.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" /> Original Image
          </h2>

          {!selectedImage ? (
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <p className="mb-2 text-sm text-gray-700">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, WebP (Max 15MB)</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="space-y-6">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative group">
                <img src={previewUrl!} alt="Preview" className="w-full h-full object-contain" />
                <button 
                  onClick={handleReset}
                  className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={removeBackground}
                disabled={processing || isModelLoading || !isLibraryLoaded}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isNaN(progress) || progress === 0 ? 'Processing...' : `Processing... ${progress}%`}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Remove Background
                  </>
                )}
              </button>
              
              {isModelLoading && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <p className="text-xs text-blue-700">
                    Initializing high-precision AI engine... This may take a few seconds on first load.
                  </p>
                </div>
              )}

              {!isModelLoading && !isLibraryLoaded && (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                  <p className="text-xs text-orange-700">
                    The AI engine failed to initialize or is taking too long.
                  </p>
                  <button 
                    onClick={loadLibrary}
                    className="text-xs font-bold text-orange-800 flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry Loading Engine
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Output Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-600" /> Result
          </h2>

          <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden relative border-2 border-dashed border-gray-200 flex items-center justify-center">
            {resultUrl ? (
              <div className="w-full h-full relative group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-20" />
                <img src={resultUrl} alt="Result" className="w-full h-full object-contain relative z-10" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 gap-3">
                  <button 
                    onClick={downloadResult}
                    className="bg-white text-gray-900 px-6 py-2 rounded-full font-semibold flex items-center gap-2 hover:scale-105 transition-transform"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button 
                    onClick={startEditing}
                    className="bg-purple-600 text-white px-6 py-2 rounded-full font-semibold flex items-center gap-2 hover:scale-105 transition-transform"
                  >
                    <Paintbrush className="w-4 h-4" /> Refine
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 p-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  {processing ? 'AI is working its magic...' : 'Your professional result will appear here'}
                </p>
              </div>
            )}
          </div>

          {resultUrl && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={downloadResult}
                  className="py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
                <button
                  onClick={handleReset}
                  className="py-4 bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reset
                </button>
              </div>
              <p className="text-[10px] text-center text-gray-400 uppercase tracking-wider font-semibold">
                High-precision output generated locally
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}
        </section>
      </div>

      {/* Info Section */}
      <section className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h3 className="font-bold text-blue-900">Pro Accuracy</h3>
            <p className="text-sm text-blue-700">Uses industry-standard models for pixel-perfect background removal, even with hair and complex edges.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-blue-900">Privacy First</h3>
            <p className="text-sm text-blue-700">All processing happens locally on your device. Your photos are never uploaded to any server.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-blue-900">Free Forever</h3>
            <p className="text-sm text-blue-700">No subscriptions, no limits, no watermarks. Just a simple tool for your creative needs.</p>
          </div>
        </div>
      </section>
      {/* Manual Refinement Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="bg-white w-full max-w-6xl rounded-3xl overflow-hidden flex flex-col h-[90vh] shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Paintbrush className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Manual Refinement</h3>
                  <p className="text-xs text-gray-500">Paint to restore or erase parts of the image</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 disabled:opacity-30"
                  title="Undo"
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 disabled:opacity-30"
                  title="Redo"
                >
                  <Redo2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div 
              id="editor-area"
              className={`flex-1 relative bg-gray-100 overflow-hidden flex items-center justify-center ${isPanMode ? (isDrawing ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'}`}
              onWheel={handleWheel}
              style={{
                backgroundImage: `radial-gradient(#d1d5db 1px, transparent 1px), radial-gradient(#d1d5db 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px',
                backgroundColor: '#f9fafb'
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <canvas 
                  ref={displayCanvasRef}
                  onPointerDown={startDrawing}
                  onPointerUp={stopDrawing}
                  onPointerLeave={(e) => { stopDrawing(e); setMousePos(null); }}
                  onPointerMove={handlePointerMove}
                  style={{ 
                    touchAction: 'none',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                  className="shadow-2xl bg-white/50 backdrop-blur-sm rounded-lg"
                />

                {/* Brush Preview Overlay (DOM based for zero lag) */}
                {mousePos && !isPanMode && (
                  <div 
                    className="absolute pointer-events-none border-2 border-white mix-blend-difference rounded-full z-50 flex items-center justify-center"
                    style={{
                      left: mousePos.x,
                      top: mousePos.y,
                      width: brushSize,
                      height: brushSize,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </div>

            {/* Toolbar */}
            <div className="p-6 border-t border-gray-100 bg-white grid md:grid-cols-4 gap-6 items-center">
              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                <button 
                  onClick={() => { setBrushMode('remove'); setIsPanMode(false); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${brushMode === 'remove' && !isPanMode ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Eraser className="w-4 h-4" /> Erase
                </button>
                <button 
                  onClick={() => { setBrushMode('add'); setIsPanMode(false); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${brushMode === 'add' && !isPanMode ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Paintbrush className="w-4 h-4" /> Restore
                </button>
                <button 
                  onClick={() => {
                    const newPanMode = !isPanMode;
                    setIsPanMode(newPanMode);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isPanMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Pan Tool (Hold Spacebar)"
                >
                  <RefreshCw className={`w-4 h-4 ${isPanMode ? 'animate-spin-slow' : ''}`} /> Pan
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>Zoom</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="5" 
                    step="0.1"
                    value={zoom} 
                    onChange={(e) => { 
                      const newZoom = parseFloat(e.target.value);
                      zoomRef.current = newZoom;
                      setZoom(newZoom); 
                      requestAnimationFrame(updateDisplayCanvas); 
                    }}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <button 
                  onClick={() => { 
                    zoomRef.current = 1;
                    panOffsetRef.current = { x: 0, y: 0 };
                    setZoom(1); 
                    setPanOffset({ x: 0, y: 0 }); 
                    requestAnimationFrame(updateDisplayCanvas); 
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                  title="Reset View"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <span>Brush Size</span>
                  <span>{brushSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 text-gray-600 font-semibold hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={finishEditing}
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 flex items-center gap-2 transition-all"
                >
                  <Check className="w-5 h-5" /> Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
