import React, { useRef, useState, useEffect } from 'react';

const SignaturePad = ({ onSave, onClose, width = 440, height = 180 }) => {
  const canvasRef  = useRef(null);
  const [ctx, setCtx]                   = useState(null);
  const [isDrawing, setIsDrawing]       = useState(false);
  const [mode, setMode]                 = useState('draw');
  const [typedName, setTypedName]       = useState('');
  const [uploadedSrc, setUploadedSrc]   = useState(null);
  const [error, setError]               = useState('');
  const [hasContent, setHasContent]     = useState(false);

  useEffect(() => {
    if (mode === 'draw' || mode === 'type') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, width, height);
      context.strokeStyle = '#1a1a2e';
      context.lineWidth   = 2.5;
      context.lineCap     = 'round';
      context.lineJoin    = 'round';
      setCtx(context);
      setHasContent(false);
    }
  }, [mode]);

  const getXY = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: e.nativeEvent.offsetX * scaleX,
      y: e.nativeEvent.offsetY * scaleY,
    };
  };

  const startDraw = (e) => {
    if (!ctx || mode !== 'draw') return;
    e.preventDefault();
    const { x, y } = getXY(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx || mode !== 'draw') return;
    e.preventDefault();
    const { x, y } = getXY(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDraw = () => {
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  const handleType = (e) => {
    const text = e.target.value;
    setTypedName(text);

    const canvas  = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, width, height);

    if (text.trim()) {
      context.font         = `italic 52px Georgia, "Times New Roman", serif`;
      context.fillStyle    = '#1a1a2e';
      context.textAlign    = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, width / 2, height / 2);
      setHasContent(true);
    } else {
      setHasContent(false);
    }
  };

  const handleUpload = (e) => {
    setError('');
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { setError('Image must be under 5 MB');      return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedSrc(ev.target.result);
      setHasContent(true);
    };
    reader.readAsDataURL(file);
  };

  const clear = () => {
    setError('');
    setHasContent(false);

    if (mode === 'type') {
      setTypedName('');
    }
    if (mode === 'upload') {
      setUploadedSrc(null);
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
    }
  };

  const save = () => {
    setError('');

    if (mode === 'draw') {
      if (!hasContent) { setError('Please draw your signature first'); return; }
      onSave(canvasRef.current.toDataURL('image/png'));

    } else if (mode === 'type') {
      if (!typedName.trim()) { setError('Please type your name'); return; }
      const off = document.createElement('canvas');
      off.width  = width;
      off.height = height;
      const c    = off.getContext('2d');
      c.font         = `italic 52px Georgia, "Times New Roman", serif`;
      c.fillStyle    = '#1a1a2e';
      c.textAlign    = 'center';
      c.textBaseline = 'middle';
      c.fillText(typedName, width / 2, height / 2);
      onSave(off.toDataURL('image/png'));

    } else if (mode === 'upload') {
      if (!uploadedSrc) { setError('Please upload an image'); return; }
      onSave(uploadedSrc);
    }
  };

  const tabs = [
    { id: 'draw',   label: 'Draw',   icon: '✏️' },
    { id: 'type',   label: 'Type',   icon: '⌨️' },
    { id: 'upload', label: 'Upload', icon: '🖼️' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
    >
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Add Signature</h2>
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
              Your signature will be transparent on the document
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* Mode tabs */}
          <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setMode(tab.id); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                  mode === tab.id
                    ? 'bg-gray-900 text-white shadow'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <span className="text-sm sm:text-base">{tab.icon}</span>
                <span className="hidden xs:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Canvas */}
          {(mode === 'draw' || mode === 'type') && (
            <div
              className="rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 relative"
              style={{ 
                width: '100%',
                maxWidth: `${width}px`,
                aspectRatio: `${width}/${height}`,
                margin: '0 auto'
              }}
            >
              {!hasContent && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <span className="text-gray-300 text-xs sm:text-sm text-center px-4">
                    {mode === 'draw' ? 'Draw your signature here' : 'Preview appears here'}
                  </span>
                </div>
              )}
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="w-full h-full block cursor-crosshair touch-none"
                style={{ background: 'transparent' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
          )}

          {/* Type input */}
          {mode === 'type' && (
            <div className="mt-3">
              <input
                type="text"
                value={typedName}
                onChange={handleType}
                placeholder="Type your full name…"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1.5">Italic serif style</p>
            </div>
          )}

          {/* Upload */}
          {mode === 'upload' && (
            <div className="space-y-3">
              <label
                htmlFor="sig-upload"
                className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
                style={{ 
                  width: '100%',
                  maxWidth: `${width}px`,
                  aspectRatio: `${width}/${height}`,
                  margin: '0 auto'
                }}
              >
                {uploadedSrc ? (
                  <img
                    src={uploadedSrc}
                    alt="Uploaded signature"
                    className="max-w-full max-h-full object-contain p-2 sm:p-3"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 p-4">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs sm:text-sm text-center">Click to upload image</span>
                    <span className="text-[10px] sm:text-xs text-center px-2">PNG with transparency works best</span>
                  </div>
                )}
                <input
                  id="sig-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 mt-4 sm:mt-5">
            <button
              onClick={clear}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Clear
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="flex-1 sm:flex-none px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;