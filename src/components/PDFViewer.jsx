import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker — use .mjs for pdfjs-dist v4+
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/**
 * PDFViewer
 *
 * Shared canvas-based PDF viewer.
 * Renders PDF pages via react-pdf (canvas) and overlays
 * signature images with true PNG transparency on top.
 *
 * Props:
 *  fileUrl      – URL of the PDF to display
 *  fileName     – display name shown in the toolbar
 *  signatures   – array of signature objects to overlay  (optional)
 *  currentPage  – controlled page number                 (optional)
 *  onPageChange – called with new page number            (optional)
 *  dragging     – id of signature being dragged          (optional)
 *  onDragStart  – (e, sig) => void                       (optional)
 *  onDragMove   – (e) => void                            (optional)
 *  onDragEnd    – () => void                             (optional)
 *  showToolbar  – show page/zoom controls (default true) (optional)
 *  onClose      – if provided, shows a close button      (optional)
 *  height       – css height of viewer area (default '100%') (optional)
 */
const PDFViewer = ({
  fileUrl,
  fileName,
  signatures = [],
  currentPage = 1,
  onPageChange,
  dragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  showToolbar = true,
  onClose,
  height = '100%',
}) => {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setPdfError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('❌ PDF load error:', error);
    setPdfError(error.message || 'Failed to load PDF');
    setLoading(false);
  };

  const changePage = (offset) => {
    if (!onPageChange) return;
    const next = Math.max(1, Math.min(currentPage + offset, numPages || 1));
    onPageChange(next);
  };

  const zoom = (delta) => {
    setScale(s => Math.max(0.4, Math.min(2.5, parseFloat((s + delta).toFixed(1)))));
  };

  return (
    <div className="flex flex-col" style={{ height }}>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white shrink-0">
          {/* File name */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">📄</span>
            <span className="truncate text-sm font-medium" title={fileName}>
              {fileName}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Page navigation */}
            {numPages && numPages > 1 && (
              <>
                <button
                  onClick={() => changePage(-1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded hover:bg-white/20 disabled:opacity-40 transition"
                  title="Previous page"
                >
                  ◀
                </button>
                <span className="text-xs px-2 tabular-nums">
                  {currentPage} / {numPages}
                </span>
                <button
                  onClick={() => changePage(1)}
                  disabled={currentPage >= numPages}
                  className="p-1.5 rounded hover:bg-white/20 disabled:opacity-40 transition"
                  title="Next page"
                >
                  ▶
                </button>
                <div className="w-px h-5 bg-white/20 mx-1" />
              </>
            )}

            {/* Zoom */}
            <button onClick={() => zoom(-0.1)} className="p-1.5 rounded hover:bg-white/20 transition" title="Zoom out">−</button>
            <span className="text-xs w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
            <button onClick={() => zoom(0.1)} className="p-1.5 rounded hover:bg-white/20 transition" title="Zoom in">+</button>

            {/* Download */}
            <div className="w-px h-5 bg-white/20 mx-1" />
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-white/20 transition"
              title="Download"
            >
              ⬇
            </a>

            {/* Close */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-red-500/70 transition ml-1"
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PDF canvas area ──────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-700 flex justify-center items-start p-6"
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
      >
        {pdfError ? (
          <div className="text-center text-white mt-20">
            <div className="text-5xl mb-4">❌</div>
            <p className="font-semibold mb-2">Failed to load PDF</p>
            <p className="text-sm text-white/60 mb-6">{pdfError}</p>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm"
            >
              Open in browser
            </a>
          </div>
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="text-center text-white mt-20">
                <div className="animate-spin rounded-full h-14 w-14 border-4 border-white border-t-transparent mx-auto mb-4" />
                <p className="text-sm">Loading PDF…</p>
              </div>
            }
          >
            {/*
              KEY TRICK:
              `relative inline-block` on this wrapper means the
              signature <img> elements are positioned relative to
              the PDF canvas — same coordinate space, same layer stack.
              PNG transparency shows PDF pixels underneath.
            */}
            <div className="relative inline-block shadow-2xl">
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />

              {/* ── Signature overlays ─── */}
              {signatures
                .filter(sig => sig.page_number === currentPage)
                .map(sig => (
                  <div
                    key={sig.id}
                    className={`absolute select-none ${onDragStart ? 'cursor-move' : 'cursor-default'} ${
                      dragging === sig.id ? 'ring-2 ring-blue-400 z-50' : 'z-10'
                    }`}
                    style={{
                      left: sig.coordinates?.x ?? 100,
                      top:  sig.coordinates?.y ?? 100,
                      /*
                        NO background, border or padding here —
                        the img itself carries a transparent PNG,
                        so the PDF canvas shows through perfectly.
                      */
                    }}
                    onMouseDown={onDragStart ? e => { e.preventDefault(); onDragStart(e, sig); } : undefined}
                  >
                    {sig.signature_data ? (
                      <img
                        src={sig.signature_data}
                        alt={`Signature – ${sig.signer_name}`}
                        draggable={false}
                        style={{
                          maxWidth: '200px',
                          maxHeight: '100px',
                          display: 'block',
                          /* drop-shadow keeps the visual pop without a white box */
                          filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.35))',
                          pointerEvents: dragging ? 'none' : 'auto',
                        }}
                      />
                    ) : (
                      /* placeholder shown before signing */
                      <div className="flex items-center gap-1 bg-blue-500/80 backdrop-blur text-white text-xs px-2 py-1 rounded shadow">
                        <span>✍️</span>
                        <span>{sig.signer_name}</span>
                      </div>
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

export default PDFViewer;