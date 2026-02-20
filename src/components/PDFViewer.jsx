import React, { useState, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '../utils/pdfWorker';

const DEFAULT_WIDTH  = 220;
const DEFAULT_HEIGHT = 110;
const MIN_WIDTH  = 100;
const MIN_HEIGHT = 50;
const MAX_WIDTH  = 500;
const MAX_HEIGHT = 250;

const PDFViewer = ({
  fileUrl,
  fileName,
  signatures = [],
  currentPage = 1,
  onPageChange,
  onPositionChange,
  onPositionSaved,
  showToolbar = true,
  onClose,
  height = '100%',
}) => {
  const [numPages, setNumPages] = useState(null);
  
  // Initialize scale based on screen size for better mobile viewport
  const getInitialScale = () => {
    if (typeof window === 'undefined') return 1.0;
    const width = window.innerWidth;
    if (width < 640) return 0.5;  // Mobile - 50% scale
    if (width < 1024) return 0.75; // Tablet - 75% scale
    return 1.0; // Desktop - 100% scale
  };
  
  const [scale, setScale] = useState(getInitialScale());
  const [pdfError, setPdfError] = useState(null);

  const wrapperRef = useRef(null);
  const action = useRef({ active: false });

  const onLoadSuccess = ({ numPages }) => { setNumPages(numPages); setPdfError(null); };
  const onLoadError   = (err)          => { setPdfError(err?.message || 'Failed to load PDF'); };

  const goTo = (d) => onPageChange?.(Math.max(1, Math.min(currentPage + d, numPages || 1)));
  const zoom = (d) => setScale(s => Math.max(0.4, Math.min(2.5, parseFloat((s + d).toFixed(1)))));

  const handleMoveStart = (e, sig) => {
    e.stopPropagation();
    e.preventDefault(); //  Prevent scrolling on touch
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    
    // Handle both mouse and touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Get scaled coordinates (stored coordinates are at scale 1.0)
    const scaledX = (sig.coordinates?.x ?? 80) * scale;
    const scaledY = (sig.coordinates?.y ?? 80) * scale;
    
    action.current = {
      active: true,
      type:   'move',
      sigId:  sig.id,
      offsetX: clientX - rect.left - scaledX,
      offsetY: clientY - rect.top  - scaledY,
    };
  };

  const handleResizeStart = (e, sig) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent scrolling on touch
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Handle both mouse and touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    action.current = {
      active: true,
      type:   'resize',
      sigId:  sig.id,
      startX: clientX,
      startY: clientY,
      startW: sig.coordinates?.width  ?? DEFAULT_WIDTH,
      startH: sig.coordinates?.height ?? DEFAULT_HEIGHT,
      posX:   sig.coordinates?.x ?? 80,
      posY:   sig.coordinates?.y ?? 80,
    };
  };

  const handleMouseMove = (e) => {
    if (!action.current.active) return;
    e.preventDefault(); // Prevent scrolling on touch

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    
    // Handle both mouse and touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (action.current.type === 'move') {
      // Calculate position in scaled space
      let scaledX = clientX - rect.left - action.current.offsetX;
      let scaledY = clientY - rect.top  - action.current.offsetY;

      const sig = signatures.find(s => s.id === action.current.sigId);
      const w = sig?.coordinates?.width  ?? DEFAULT_WIDTH;
      const h = sig?.coordinates?.height ?? DEFAULT_HEIGHT;

      // Clamp in scaled space
      scaledX = Math.max(0, Math.min(scaledX, rect.width  - w * scale));
      scaledY = Math.max(0, Math.min(scaledY, rect.height - h * scale));

      // Convert back to unscaled coordinates for storage
      const x = scaledX / scale;
      const y = scaledY / scale;

      onPositionChange?.(action.current.sigId, { x, y, width: w, height: h });
    }

    if (action.current.type === 'resize') {
      const deltaX = clientX - action.current.startX;
      const deltaY = clientY - action.current.startY;

      // Convert delta from screen space to unscaled space
      let newW = action.current.startW + deltaX / scale;
      let newH = action.current.startH + deltaY / scale;

      newW = Math.max(MIN_WIDTH,  Math.min(MAX_WIDTH,  newW));
      newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newH));

      // Clamp based on PDF page size (unscaled)
      const maxW = (rect.width / scale)  - action.current.posX;
      const maxH = (rect.height / scale) - action.current.posY;
      newW = Math.min(newW, maxW);
      newH = Math.min(newH, maxH);

      onPositionChange?.(action.current.sigId, {
        x:      action.current.posX,
        y:      action.current.posY,
        width:  newW,
        height: newH,
      });
    }
  };

  const handleMouseUp = () => {
    if (!action.current.active) return;

    const sig = signatures.find(s => s.id === action.current.sigId);
    if (sig?.coordinates) {
      onPositionSaved?.(action.current.sigId, sig.coordinates);
    }

    action.current = { active: false };
  };

  const handleMouseLeave = () => {
    if (action.current.active) {
      handleMouseUp();
    }
  };

  const isDragging = action.current.active;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {showToolbar && (
        <div className="shrink-0 flex items-center justify-between px-2 sm:px-4 py-2 bg-gray-800 border-b border-gray-700">
          {/* Left side */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {onClose && (
              <TBtn onClick={onClose} title="Close">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </TBtn>
            )}
            <span className="hidden sm:inline text-sm text-gray-300 font-medium truncate">
              {fileName || 'Document'}
            </span>
          </div>

          {/* Center - Page controls */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <TBtn onClick={() => goTo(-1)} disabled={currentPage <= 1} title="Previous">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </TBtn>
            <span className="px-2 sm:px-3 text-xs text-gray-400 tabular-nums whitespace-nowrap">
              {currentPage}/{numPages || '?'}
            </span>
            <TBtn onClick={() => goTo(1)} disabled={currentPage >= (numPages || 1)} title="Next">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </TBtn>
          </div>

          {/* Right side - Zoom controls */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <TBtn onClick={() => zoom(-0.1)} disabled={scale <= 0.4} title="Zoom out">
              <span className="text-base sm:text-lg">−</span>
            </TBtn>
            <span className="hidden sm:inline px-2 text-xs text-gray-400 tabular-nums min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <TBtn onClick={() => zoom(0.1)} disabled={scale >= 2.5} title="Zoom in">
              <span className="text-base sm:text-lg">+</span>
            </TBtn>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-8">
        <div className="min-h-full flex items-start justify-start sm:items-center sm:justify-center">
          {pdfError ? (
            <div className="w-full">
              <ErrState fileUrl={fileUrl} message={pdfError}/>
            </div>
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={onLoadSuccess}
              onLoadError={onLoadError}
              loading={<LoadState/>}
              error={<ErrState fileUrl={fileUrl} message="Failed to load PDF"/>}
            >
              <div
                ref={wrapperRef}
                className="relative inline-block shadow-lg sm:shadow-2xl"
                style={{ lineHeight: 0, cursor: isDragging ? 'grabbing' : 'default' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />

                {signatures
                  .filter(s => s.page_number === currentPage)
                  .map(sig => {
                  const isLocked = sig.link_sent || sig.status === 'signed' || sig.status === 'rejected';
                  const canDrag  = onPositionChange && !isLocked;

                  // Stored coordinates are at scale 1.0, so scale them for display
                  const w = (sig.coordinates?.width  ?? DEFAULT_WIDTH) * scale;
                  const h = (sig.coordinates?.height ?? DEFAULT_HEIGHT) * scale;
                  const x = (sig.coordinates?.x ?? 80) * scale;
                  const y = (sig.coordinates?.y ?? 80) * scale;

                  return (
                    <div
                      key={sig.id}
                      className="absolute z-10 select-none group"
                      style={{
                        left:   x,
                        top:    y,
                        width:  w,
                        height: h,
                        cursor: canDrag ? 'grab' : 'default',
                        touchAction: canDrag ? 'none' : 'auto', // Prevent scroll while dragging
                      }}
                      onMouseDown={canDrag ? e => handleMoveStart(e, sig) : undefined}
                      onTouchStart={canDrag ? e => handleMoveStart(e, sig) : undefined}
                      title={isLocked ? 'Position locked' : ''}
                    >
                      {sig.signature_data ? (
                        <img
                          src={sig.signature_data}
                          alt={`Sig – ${sig.signer_name}`}
                          draggable={false}
                          style={{
                            width:         '100%',
                            height:        '100%',
                            objectFit:     'contain',
                            objectPosition:'left center',
                            display:       'block',
                            pointerEvents: 'none',
                            filter:        'drop-shadow(0 1px 3px rgba(0,0,0,0.45))',
                            userSelect:    'none',
                          }}
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center gap-1 sm:gap-1.5 text-white text-xs font-medium rounded border shadow-lg backdrop-blur-sm ${
                            isLocked
                              ? 'bg-gray-500/70 border-gray-400/40'
                              : 'bg-blue-500/70 border-blue-400/40'
                          }`}
                        >
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isLocked ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                            )}
                          </svg>
                          <span className="truncate text-[10px] sm:text-xs">{sig.signer_name}</span>
                          {isLocked && <span className="text-[10px] opacity-70">🔒</span>}
                        </div>
                      )}

                      {canDrag && !sig.signature_data && (
                        <div
                          className="absolute bottom-0 right-0 w-4 h-4 sm:w-4 sm:h-4 bg-blue-400 rounded-tl cursor-nwse-resize opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          style={{ 
                            borderBottomRightRadius: 4,
                            touchAction: 'none', // Prevent scroll while resizing
                          }}
                          onMouseDown={e => handleResizeStart(e, sig)}
                          onTouchStart={e => handleResizeStart(e, sig)}
                          title="Drag to resize"
                        >
                          <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white absolute bottom-0.5 right-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 17L17 7M17 17V7h0"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Document>
          )}
        </div>
      </div>
    </div>
  );
};

const TBtn = ({ onClick, disabled, title, danger, children }) => (
  <button onClick={onClick} disabled={disabled} title={title}
    className={`p-1.5 sm:p-2 text-sm rounded transition ${
      danger
        ? 'text-red-400 hover:bg-red-500/20 disabled:text-red-800'
        : 'text-gray-400 hover:bg-gray-700 disabled:text-gray-600'
    } disabled:cursor-not-allowed`}>
    {children}
  </button>
);

const LoadState = () => (
  <div className="flex flex-col items-center justify-center py-12 sm:py-24 text-gray-400">
    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-gray-700 border-t-gray-400 rounded-full animate-spin mb-4"/>
    <p className="text-xs sm:text-sm">Loading PDF...</p>
  </div>
);

const ErrState = ({ fileUrl, message }) => (
  <div className="flex flex-col items-center justify-center py-12 sm:py-24 text-gray-400 px-4">
    <svg className="w-12 h-12 sm:w-16 sm:h-16 mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    <p className="text-xs sm:text-sm mb-2 text-center">{message || 'Failed to load PDF'}</p>
    {fileUrl && <p className="text-xs text-gray-500 max-w-md truncate text-center">{fileUrl}</p>}
  </div>
);

export default PDFViewe