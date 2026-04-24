import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Image as ImageIcon, Download, Trash2, Loader2, Wand2, RefreshCw, Eraser, Paintbrush, Check, X, Undo2, Redo2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

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

  const [processingStatus, setProcessingStatus] = React.useState('');

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
      const config = {
        progress: (status: any, progressValue: any, total: any) => {
          let fraction = 0;
          
          if (typeof status === 'number') {
            fraction = status;
          } else if (typeof progressValue === 'number') {
            if (typeof total === 'number' && total > 0) {
              fraction = progressValue / total;
            } else {
              fraction = progressValue;
            }
          }

          const now = Date.now();
          if (now - lastProgressUpdateRef.current > 100) { 
            const percentage = Math.round(fraction * 100);
            if (!isNaN(percentage) && percentage <= 100) {
              setProgress(percentage);
              const statusStr = typeof status === 'string' ? status.toLowerCase() : '';
              if (statusStr.includes('fetch')) setProcessingStatus('Downloading AI Core...');
              else if (statusStr.includes('compute')) setProcessingStatus('Analysing Pixels...');
              else setProcessingStatus(percentage < 40 ? 'Downloading AI Core...' : percentage < 80 ? 'Analysing Pixels...' : 'Refining Edges...');
            }
            lastProgressUpdateRef.current = now;
          }
        },
        model: 'small',
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
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          <Wand2 className="w-3 h-3" /> AI Powered
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
          Professional AI <span className="text-blue-600">Background Remover</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
          Remove backgrounds with professional precision using advanced AI. 
          100% private, runs entirely in your browser.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Input & Controls */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-12"
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Input Card */}
            <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Source Image
                </h2>
                {selectedImage && (
                  <button 
                    onClick={handleReset}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex-1">
                {!selectedImage ? (
                  <label className="group relative flex flex-col items-center justify-center w-full h-[400px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[24px] cursor-pointer bg-gray-50/50 dark:bg-gray-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all duration-300">
                    <div className="flex flex-col items-center text-center px-6">
                      <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-md shadow-gray-200/50 dark:shadow-none group-hover:scale-110 transition-transform duration-500">
                        <Upload className="w-8 h-8 text-blue-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">Drop your image here</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">PNG, JPG or WebP up to 15MB</p>
                      <div className="mt-8 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                        Browse Files
                      </div>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                ) : (
                  <div className="h-[400px] bg-gray-50 dark:bg-gray-800/50 rounded-[24px] overflow-hidden relative border border-gray-100 dark:border-gray-800">
                    <img 
                      src={previewUrl!} 
                      alt="Preview" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full text-white text-xs font-bold">
                      {Math.round(selectedImage.size / 1024 / 1024 * 10) / 10} MB
                    </div>
                  </div>
                )}
              </div>

              {selectedImage && !resultUrl && (
                <button
                  onClick={removeBackground}
                  disabled={processing || isModelLoading || !isLibraryLoaded}
                  className="mt-6 w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-[20px] font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-200 dark:shadow-none"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      {progress > 0 ? `${processingStatus} ${progress}%` : 'Starting Engine...'}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-6 h-6" />
                      Remove Background
                    </>
                  )}
                </button>
              )}

              {isModelLoading && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-center gap-3 animate-pulse">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                    Warming up AI Engine...
                  </p>
                </div>
              )}
            </div>

            {/* Result Card */}
            <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 flex flex-col h-full relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  Processed Result
                </h2>
              </div>

              <div className="flex-1">
                <div className="h-[400px] bg-gray-50 dark:bg-gray-800/50 rounded-[24px] overflow-hidden relative border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                  {processing && (
                    <div className="absolute inset-0 z-30 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                      <div className="relative w-24 h-24 mb-6">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="44"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-200 dark:text-gray-700"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="44"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={276}
                            strokeDashoffset={276 - (276 * progress) / 100}
                            strokeLinecap="round"
                            className="text-blue-600 transition-all duration-300"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-blue-600">
                          {progress}%
                        </div>
                      </div>
                      <h4 className="text-lg font-black text-gray-900 dark:text-white mb-1">{processingStatus}</h4>
                      <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest animate-pulse">Running Neural Network</p>
                    </div>
                  )}

                  {resultUrl ? (
                    <div className="w-full h-full relative group">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-10" />
                      <motion.img 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        src={resultUrl} 
                        alt="Result" 
                        className="w-full h-full object-contain relative z-10 p-4"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center px-12 opacity-30">
                      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                        <Loader2 className="w-8 h-8 text-gray-700 dark:text-gray-200" />
                      </div>
                      <p className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest">Awaiting Neural Process</p>
                    </div>
                  )}
                </div>
              </div>

              {resultUrl && (
                <div className="mt-6 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={downloadResult}
                      className="py-4 bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-[20px] font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-gray-200 dark:shadow-none"
                    >
                      <Download className="w-5 h-5" /> Download
                    </button>
                    <button 
                      onClick={startEditing}
                      className="py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-[20px] font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-purple-200 dark:shadow-none"
                    >
                      <Paintbrush className="w-5 h-5" /> Refine
                    </button>
                  </div>
                  <button 
                    onClick={handleReset}
                    className="w-full py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400 rounded-[20px] font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className="w-5 h-5" /> Start Over
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                  <X className="w-4 h-4 text-red-600" />
                  <p className="text-xs font-bold text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Features Showcase */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid md:grid-cols-3 gap-8 pt-12"
      >
        {[
          { title: "Smart Isolation", desc: "Ultra-precise edge detection for complex details like hair or fur.", icon: Wand2, color: "blue" },
          { title: "Browser Native", desc: "Runs 100% locally. Your data never touches a server.", icon: Check, color: "green" },
          { title: "Manual Control", desc: "Touch up with professional brush tools and multi-layer masking.", icon: Paintbrush, color: "purple" }
        ].map((f, i) => (
          <div key={i} className="group p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] hover:border-blue-100 dark:hover:border-blue-900/30 transition-colors shadow-sm">
            <div className={`w-12 h-12 rounded-2xl bg-${f.color}-50 dark:bg-${f.color}-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
              <f.icon className={`w-6 h-6 text-${f.color}-600 dark:text-${f.color}-400`} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{f.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Refined Pro Workplace Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center md:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#111111] w-full h-full md:rounded-[40px] overflow-hidden flex flex-col shadow-2xl relative border border-white/5"
            >
              {/* Pro Header */}
              <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/30">
                    <Paintbrush className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-white uppercase tracking-wider text-sm">Refinement Studio</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Manual Mode Active</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-8 w-px bg-white/10 mx-4" />
                  <button 
                    onClick={undo}
                    disabled={!canUndo}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={redo}
                    disabled={!canRedo}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                  <div className="h-8 w-px bg-white/10 mx-4" />
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Workspace Split */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Rails / Tools */}
                <div className="w-20 border-r border-white/5 flex flex-col items-center py-8 gap-4 bg-black/40">
                  <button 
                    onClick={() => { setBrushMode('remove'); setIsPanMode(false); }}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${brushMode === 'remove' && !isPanMode ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                    title="Erase"
                  >
                    <Eraser className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => { setBrushMode('add'); setIsPanMode(false); }}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${brushMode === 'add' && !isPanMode ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                    title="Restore"
                  >
                    <Paintbrush className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setIsPanMode(!isPanMode)}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${isPanMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                    title="Pan Tool (Space)"
                  >
                    <Maximize className="w-6 h-6" />
                  </button>
                  <div className="mt-auto flex flex-col gap-4 mb-4">
                    <button 
                      onClick={() => { zoomRef.current *= 1.2; setZoom(zoomRef.current); requestAnimationFrame(updateDisplayCanvas); }}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl text-gray-500 hover:bg-white/5 hover:text-white transition-all"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { zoomRef.current *= 0.8; setZoom(zoomRef.current); requestAnimationFrame(updateDisplayCanvas); }}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl text-gray-500 hover:bg-white/5 hover:text-white transition-all"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Viewport */}
                <div 
                  id="editor-area"
                  className={`flex-1 relative bg-[#090909] overflow-hidden flex items-center justify-center ${isPanMode ? (isDrawing ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'}`}
                  onWheel={handleWheel}
                  style={{
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: '30px 30px'
                  }}
                >
                  <canvas 
                    ref={displayCanvasRef}
                    onPointerDown={startDrawing}
                    onPointerUp={stopDrawing}
                    onPointerLeave={(e) => { stopDrawing(e); setMousePos(null); }}
                    onPointerMove={handlePointerMove}
                    style={{ 
                      touchAction: 'none',
                      maxWidth: '90%',
                      maxHeight: '90%',
                      objectFit: 'contain'
                    }}
                    className="shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5"
                  />

                  {/* Dynamic Pointer UI */}
                  {mousePos && !isPanMode && (
                    <div 
                      className="absolute pointer-events-none rounded-full border border-white/50 z-50 flex items-center justify-center backdrop-blur-[1px]"
                      style={{
                        left: mousePos.x,
                        top: mousePos.y,
                        width: brushSize * (zoomRef.current / (displayCanvasRef.current ? displayCanvasRef.current.width / displayCanvasRef.current.getBoundingClientRect().width : 1)),
                        height: brushSize * (zoomRef.current / (displayCanvasRef.current ? displayCanvasRef.current.height / displayCanvasRef.current.getBoundingClientRect().height : 1)),
                        transform: 'translate(-50%, -50%)',
                        boxShadow: `0 0 20px ${brushMode === 'add' ? 'rgba(147, 51, 234, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                      }}
                    >
                      <div className="w-0.5 h-0.5 bg-white rounded-full opacity-50" />
                    </div>
                  )}

                  {/* Keyboard Shortcut Tips */}
                  <div className="absolute top-6 left-6 flex gap-3 pointer-events-none opacity-50">
                    <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 text-[9px] font-black text-white uppercase tracking-widest">[Space] Pan</div>
                    <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 text-[9px] font-black text-white uppercase tracking-widest">[Scroll] Zoom</div>
                    <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 text-[9px] font-black text-white uppercase tracking-widest">[S] Erase</div>
                    <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 text-[9px] font-black text-white uppercase tracking-widest">[D] Restore</div>
                  </div>
                </div>

                {/* Right Rail: Adjustments */}
                <div className="w-72 border-l border-white/5 bg-black/40 p-8 flex flex-col gap-10">
                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline mb-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Brush Size</label>
                       <span className="text-white font-mono text-sm">{brushSize}px</span>
                    </div>
                    <div className="relative group flex items-center h-6">
                      <input 
                        type="range" 
                        min="5" 
                        max="200" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline mb-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Magnification</label>
                       <span className="text-white font-mono text-sm">{Math.round(zoom * 100)}%</span>
                    </div>
                    <div className="relative group flex items-center h-6">
                      <input 
                        type="range" 
                        min="0.1" 
                        max="5" 
                        step="0.01"
                        value={zoom} 
                        onChange={(e) => { 
                          const newZoom = parseFloat(e.target.value);
                          zoomRef.current = newZoom;
                          setZoom(newZoom); 
                          requestAnimationFrame(updateDisplayCanvas); 
                        }}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-auto space-y-4 pt-10 border-t border-white/5">
                    <button 
                      onClick={finishEditing}
                      className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-xl shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" /> Export Result
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-2xl transition-all"
                    >
                      Discard Edits
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
