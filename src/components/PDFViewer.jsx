import React, { useState, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '../utils/pdfWorker';


const PDFViewer = ({
  fileUrl,
  fileName,
  signatures = [],
  currentPage = 1,
  onPageChange,
  draggingId,
  onDragStart,
  onDragMove,
  onDragEnd,
  showToolbar = true,
  onClose,
  height = '100%',
}) => {
  const [numPages, setNumPages]   = useState(null);
  const [scale, setScale]         = useState(1.0);
  const [pdfError, setPdfError]   = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const onLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setPdfError(null);
  };

  const onLoadError = (err) => {
    console.error('PDFViewer load error:', err);
    setPdfError(err?.message || 'Failed to load PDF');
    setIsLoading(false);
  };

  const goTo = (delta) => {
    if (!onPageChange) return;
    onPageChange(Math.max(1, Math.min(currentPage + delta, numPages || 1)));
  };

  const adjustZoom = (delta) =>
    setScale(s => Math.max(0.4, Math.min(2.5, parseFloat((s + delta).toFixed(1)))));

  return (
    <div
      className="flex flex-col bg-[#1a1a2e]"
      style={{ height }}
    >
      {/* ── Toolbar ───────────────────────────────────────────────── */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#16213e] border-b border-white/10 shrink-0">

          {/* Left — file name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-blue-600/30 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-white/80 truncate" title={fileName}>
              {fileName}
            </span>
          </div>

          {/* Right — controls */}
          <div className="flex items-center gap-1 shrink-0">

            {/* Page nav */}
            {numPages && numPages > 1 && (
              <>
                <ToolbarBtn onClick={() => goTo(-1)} disabled={currentPage <= 1} title="Previous page">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </ToolbarBtn>
                <span className="text-xs text-white/50 px-1.5 tabular-nums">
                  {currentPage} / {numPages}
                </span>
                <ToolbarBtn onClick={() => goTo(1)} disabled={currentPage >= numPages} title="Next page">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </ToolbarBtn>
                <div className="w-px h-4 bg-white/20 mx-1" />
              </>
            )}

            {/* Zoom */}
            <ToolbarBtn onClick={() => adjustZoom(-0.1)} title="Zoom out">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </ToolbarBtn>
            <span className="text-xs text-white/50 w-10 text-center tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <ToolbarBtn onClick={() => adjustZoom(0.1)} title="Zoom in">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </ToolbarBtn>

            <div className="w-px h-4 bg-white/20 mx-1" />

            {/* Download */}
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>

            {/* Close */}
            {onClose && (
              <ToolbarBtn onClick={onClose} title="Close" danger>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </ToolbarBtn>
            )}
          </div>
        </div>
      )}

      {/* ── Canvas area ───────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-auto flex justify-center items-start p-8"
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
      >
        {pdfError ? (
          <ErrorState fileUrl={fileUrl} message={pdfError} />
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={onLoadSuccess}
            onLoadError={onLoadError}
            loading={<LoadingState />}
            error={<ErrorState fileUrl={fileUrl} message="Failed to load PDF" />}
          >
            {/*
              ─── KEY: `relative inline-block` ───────────────────────
              This wrapper is the shared coordinate space.
              The <canvas> from <Page> and every signature <img>
              live inside it, so absolute positioning of signatures
              is relative to the top-left of the PDF page itself.
              Transparent PNG pixels = PDF canvas pixels show through.
              ────────────────────────────────────────────────────────
            */}
            <div
              className="relative inline-block shadow-2xl"
              style={{ lineHeight: 0 }}  /* kills inline gap below canvas */
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />

              {/* ── Signature overlays ──────────────────────────────── */}
              {signatures
                .filter(sig => sig.page_number === currentPage)
                .map(sig => (
                  <div
                    key={sig.id}
                    className={`absolute select-none ${
                      onDragStart ? 'cursor-move' : 'cursor-default'
                    } ${draggingId === sig.id ? 'z-50' : 'z-10'}`}
                    style={{
                      left: sig.coordinates?.x ?? 100,
                      top:  sig.coordinates?.y ?? 100,
                    }}
                    onMouseDown={
                      onDragStart
                        ? e => { e.preventDefault(); onDragStart(e, sig); }
                        : undefined
                    }
                  >
                    {sig.signature_data ? (
                      /*
                        The <img> carries a transparent PNG.
                        No background, no border, no padding.
                        drop-shadow gives visual pop without a white box.
                        Transparent pixels → PDF canvas shows through.
                      */
                      <img
                        src={sig.signature_data}
                        alt={`Signature – ${sig.signer_name}`}
                        draggable={false}
                        style={{
                          maxWidth:       '220px',
                          maxHeight:      '110px',
                          display:        'block',
                          pointerEvents:  draggingId ? 'none' : 'auto',
                          filter:         'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
                          userSelect:     'none',
                        }}
                      />
                    ) : (
                      /* Placeholder before the signature image is drawn */
                      <div className="flex items-center gap-1.5 bg-blue-500/75 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded shadow-lg border border-blue-400/40">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {sig.signer_name}
                      </div>
                    )}

                    {/* Drag ring */}
                    {draggingId === sig.id && (
                      <div className="absolute inset-0 ring-2 ring-blue-400 ring-offset-1 rounded pointer-events-none" />
                    )}
                  </div>
                ))}
            </div>
          </Document>
        )}
      </div>
    </div>
  );
};

/* ── Small reusable sub-components ──────────────────────────────── */

const ToolbarBtn = ({ onClick, disabled, title, danger, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition disabled:opacity-30 disabled:cursor-not-allowed
      ${danger
        ? 'text-white/50 hover:text-red-400 hover:bg-red-500/20'
        : 'text-white/50 hover:text-white hover:bg-white/10'
      }`}
  >
    {children}
  </button>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center text-white/50 py-20 gap-4">
    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-blue-400 animate-spin" />
    <span className="text-sm">Loading PDF…</span>
  </div>
);

const ErrorState = ({ fileUrl, message }) => (
  <div className="flex flex-col items-center justify-center text-white/60 py-20 gap-3">
    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <p className="text-sm font-medium text-white/70">{message}</p>
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-400 hover:text-blue-300 underline"
    >
      Open in browser instead
    </a>
  </div>
);

export default PDFViewer;