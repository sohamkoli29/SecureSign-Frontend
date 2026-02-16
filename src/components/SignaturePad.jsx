import React, { useRef, useState, useEffect } from 'react';

const SignaturePad = ({ onSave, onClose, width = 400, height = 200 }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);
  const [signatureType, setSignatureType] = useState('draw'); // 'draw', 'type', 'upload'
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [error, setError] = useState('');

  // Initialize canvas
  useEffect(() => {
    if (signatureType === 'draw') {
      initCanvas();
    }
  }, [signatureType]);

  const initCanvas = () => {
  const canvas = canvasRef.current;
  if (canvas) {
    const context = canvas.getContext('2d');
    context.strokeStyle = '#000';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    // Keep transparent background
    context.clearRect(0, 0, width, height);
    setCtx(context);
  }
};

  const startDrawing = (e) => {
    if (!ctx || signatureType !== 'draw') return;
    
    e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx || signatureType !== 'draw') return;
    
    e.preventDefault();
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!ctx) return;
    setIsDrawing(false);
    ctx.closePath();
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
      return {
        offsetX: (e.touches[0].clientX - rect.left) * scaleX,
        offsetY: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      offsetX: e.nativeEvent.offsetX * scaleX,
      offsetY: e.nativeEvent.offsetY * scaleY
    };
  };
const clearSignature = () => {
  if (signatureType === 'draw') {
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, width, height);
  } else if (signatureType === 'type') {
    setTypedSignature('');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, width, height);
    }
  } else if (signatureType === 'upload') {
    setUploadedImage(null);
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, width, height);
    }
  }
};

const handleTypeSignature = (e) => {
  const text = e.target.value;
  setTypedSignature(text);
  
  if (!canvasRef.current) return;
  
  const canvas = canvasRef.current;
  const context = canvas.getContext('2d');
  
  // Clear canvas - KEEP TRANSPARENT
  context.clearRect(0, 0, width, height);
  
  if (text) {
    // Draw text signature on transparent background
    context.font = '48px "Dancing Script", cursive, "Brush Script MT", cursive';
    context.fillStyle = '#000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, width / 2, height / 2);
  }
};

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
       // Clear canvas - KEEP TRANSPARENT
ctx.clearRect(0, 0, width, height);
        
        // Calculate dimensions to fit canvas while maintaining aspect ratio
        const scale = Math.min(width / img.width, height / img.height) * 0.8;
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        setUploadedImage(event.target.result);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveSignature = () => {
    try {
      let signatureData = null;

      if (signatureType === 'draw') {
        // Get from canvas
        if (!canvasRef.current) {
          setError('Canvas not initialized');
          return;
        }
        signatureData = canvasRef.current.toDataURL('image/png');
     } else if (signatureType === 'type') {
  if (!typedSignature) {
    setError('Please type your signature');
    return;
  }
  // Create a canvas with the typed signature - TRANSPARENT
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Don't fill background - keep transparent
  ctx.font = '48px "Dancing Script", cursive, "Brush Script MT", cursive';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(typedSignature, width / 2, height / 2);
  
  signatureData = canvas.toDataURL('image/png');
} else if (signatureType === 'upload') {
        if (!uploadedImage) {
          setError('Please upload an image');
          return;
        }
        signatureData = uploadedImage;
      }

      if (!signatureData) {
        setError('No signature data available');
        return;
      }

      onSave(signatureData);
    } catch (err) {
      console.error('Error saving signature:', err);
      setError('Failed to save signature: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Add Signature</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Signature Type Selector */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setSignatureType('draw')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                signatureType === 'draw'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Draw
            </button>
            <button
              onClick={() => setSignatureType('type')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                signatureType === 'type'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Type
            </button>
            <button
              onClick={() => setSignatureType('upload')}
              className={`flex-1 py-2 px-4 rounded-lg ${
                signatureType === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upload
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Drawing Canvas */}
          {signatureType === 'draw' && (
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
  <canvas
    ref={canvasRef}
    width={width}
    height={height}
    onMouseDown={startDrawing}
    onMouseMove={draw}
    onMouseUp={stopDrawing}
    onMouseLeave={stopDrawing}
    onTouchStart={startDrawing}
    onTouchMove={draw}
    onTouchEnd={stopDrawing}
    className="w-full cursor-crosshair touch-none bg-white"
  />
</div>
          )}

          {/* Type Signature */}
          {signatureType === 'type' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Type your name"
                value={typedSignature}
                onChange={handleTypeSignature}
                className="input-field"
              />
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
  <canvas
    ref={canvasRef}
    width={width}
    height={height}
    className="w-full bg-white"
  />
</div>
              <p className="text-sm text-gray-500">
                Use a cursive font style for a realistic signature
              </p>
            </div>
          )}

          {/* Upload Signature */}
          {signatureType === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="signature-upload"
                  onChange={handleImageUpload}
                />
                <label
                  htmlFor="signature-upload"
                  className="cursor-pointer inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Click to upload signature image</span>
                </label>
                <p className="mt-2 text-sm text-gray-500">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
              {uploadedImage && (
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded signature" 
                    className="w-full h-auto"
                    style={{ maxHeight: '200px', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={clearSignature}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Clear
            </button>
            <div className="space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Signature
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;