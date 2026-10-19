import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Send, AlertCircle, Scan, X, Check, Flashlight } from 'lucide-react';

interface CameraCaptureProps {
  mode?: 'HINT' | 'SCAN_CLAIM';
  onCaptured: (data: { media: string; text?: string }) => void;
  onClose?: () => void;
}

export default function CameraCapture({ mode = 'HINT', onCaptured, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [hintCaption, setHintCaption] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera for outdoor hiding spots
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setErrorMessage('Camera access is required. Please check your browser permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageUrl = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedMedia(imageUrl);
    stopCamera();
  };

  const retake = () => {
    setCapturedMedia(null);
    startCamera();
  };

  const submit = () => {
    if (!capturedMedia) return;
    onCaptured({
      media: capturedMedia,
      text: hintCaption,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-4 font-sans">
      
      {/* Top Bar */}
      <div className="w-full max-w-md flex justify-between items-center py-2 z-10">
        <div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">
            {mode === 'HINT' ? 'Live Hint Stream' : 'Target Scan & Verify'}
          </span>
          <h2 className="text-lg font-bold text-white mt-1 font-tactical">
            {mode === 'HINT' ? 'Snap Location Hint' : 'Scan Target Hider'}
          </h2>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl max-w-md w-full flex items-center space-x-2 my-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Camera Viewport */}
      <div className="relative w-full max-w-md flex-1 my-3 bg-black rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center">
        
        {!capturedMedia ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Viewfinder Overlay HUD */}
            <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
              </div>
              <div className="text-center">
                <span className="text-[10px] text-white/50 bg-black/40 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                  {mode === 'HINT' ? 'Live Camera Only (Gallery Blocked)' : 'Align Target In Frame'}
                </span>
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
              </div>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full">
            <img src={capturedMedia} alt="Live Captured Hint" className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4 bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              ✓ Verified Live Frame
            </div>
          </div>
        )}

      </div>

      {/* Controls & Inputs */}
      <div className="w-full max-w-md space-y-3 z-10 pb-2">
        
        {capturedMedia && mode === 'HINT' && (
          <input
            type="text"
            value={hintCaption}
            onChange={(e) => setHintCaption(e.target.value)}
            placeholder="Add clue caption (e.g. 'Under the clock tower brick arch...')"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        )}

        {!capturedMedia ? (
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={capturePhoto}
              className="w-20 h-20 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/25 active:scale-95 transition-all"
            >
              <Camera className="w-8 h-8" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={retake}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold py-3.5 rounded-2xl flex items-center justify-center space-x-2 border border-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retake</span>
            </button>
            <button
              onClick={submit}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all font-tactical"
            >
              {mode === 'HINT' ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Hint</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Verify Claim</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
