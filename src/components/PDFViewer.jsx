import React, { useState, useRef, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '../utils/pdfWorker';

/**
 * PDFViewer
 *
 * ALL drag logic lives here — the wrapper ref is local so coords
 * are always calculated against the exact element that signatures
 * are positioned inside. No ref passing needed.
 *
 * Props
 * ─────
 * fileUrl       string
 * fileName      string
 * signatures    array   [{id, coordinates:{x,y}, page_number, status, signer_name, signature_data}]
 * currentPage   number
 * onPageChange  fn(page)
 * onPositionChange fn(sigId, {x, y})  — called live while dragging
 * onPositionSaved  fn(sigId, {x, y}) — called on mouse up (save to DB)
 * showToolbar   bool
 * onClose       fn
 * height        string
 */
const SIG_W = 220;
const SIG_H = 110;

const PDFViewer = ({
  fileUrl,
  fileName,
  signatures = [],
  currentPage = 1,
  onPageChange,
  onPositionChange,  // live update while dragging
  onPositionSaved,   // save on drop
  showToolbar = true,
  onClose,
  height = '100%',
}) => {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale]       = useState(1.0);
  const [pdfError, setPdfError] = useState(null);

  // The ONE ref — the `relative inline-block` wrapper that contains
  // both the PDF <canvas> and the signature overlay divs.
  const wrapperRef  = useRef(null);

  // Drag state — all in a single ref to avoid stale closures
  const drag = useRef({ active: false, sigId: null, offsetX: 0, offsetY: 0 });

  const onLoadSuccess = ({ numPages }) => { setNumPages(numPages); setPdfError(null); };
  const onLoadError   = (err)          => { setPdfError(err?.message || 'Failed to load PDF'); };

  const goTo = (d) => onPageChange?.(Math.max(1, Math.min(currentPage + d, numPages || 1)));
  const zoom = (d) => setScale(s => Math.max(0.4, Math.min(2.5, parseFloat((s + d).toFixed(1)))));

  /* ── Drag handlers — all use wrapperRef directly ──────────────── */

  const handleMouseDown = useCallback((e, sig) => {
    e.preventDefault();
    e.stopPropagation();

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const wRect  = wrapper.getBoundingClientRect();
    const sigEl  = e.currentTarget;
    const sRect  = sigEl.getBoundingClientRect();

    // Offset = where inside the sig element the user clicked
    drag.current = {
      active:  true,
      sigId:   sig.id,
      offsetX: e.clientX - sRect.left,
      offsetY: e.clientY - sRect.top,
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!drag.current.active) return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const wRect = wrapper.getBoundingClientRect();

    // Coordinates relative to wrapper top-left
    let x = e.clientX - wRect.left - drag.current.offsetX;
    let y = e.clientY - wRect.top  - drag.current.offsetY;

    // ── Hard clamp to PDF page bounds ──────────────────────────────
    // Signature can't go past the right/bottom edge of the PDF page.
    // wRect.width/height IS the PDF page size (wrapper hugs the canvas).
    x = Math.max(0, Math.min(x, wRect.width  - SIG_W));
    y = Math.max(0, Math.min(y, wRect.height - SIG_H));

    onPositionChange?.(drag.current.sigId, { x, y });
  }, [onPositionChange]);

  const handleMouseUp = useCallback((e) => {
    if (!drag.current.active) return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const wRect = wrapper.getBoundingClientRect();

    let x = e.clientX - wRect.left - drag.current.offsetX;
    let y = e.clientY - wRect.top  - drag.current.offsetY;

    x = Math.max(0, Math.min(x, wRect.width  - SIG_W));
    y = Math.max(0, Math.min(y, wRect.height - SIG_H));

    const sigId = drag.current.sigId;
    drag.current = { active: false, sigId: null, offsetX: 0, offsetY: 0 };

    onPositionSaved?.(sigId, { x, y });
  }, [onPositionSaved]);

  const handleMouseLeave = useCallback(() => {
    if (!drag.current.active) return;
    // Treat leaving the wrapper as a drop
    const sigId = drag.current.sigId;
    drag.current = { active: false, sigId: null, offsetX: 0, offsetY: 0 };
    // Don't save — just cancel the drag to avoid phantom positions
    onPositionChange && onPositionChange(sigId, null); // null = revert
  }, [onPositionChange]);

  const isDragging = drag.current.active;

  return (
    <div className="flex flex-col bg-[#1a1a2e]" style={{ height }}>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#16213e] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-blue-600/30 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-white/80 truncate" title={fileName}>{fileName}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {numPages && numPages > 1 && (<>
              <TBtn onClick={() => goTo(-1)} disabled={currentPage <= 1} title="Prev">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
              </TBtn>
              <span className="text-xs text-white/50 px-1.5 tabular-nums">{currentPage} / {numPages}</span>
              <TBtn onClick={() => goTo(1)} disabled={currentPage >= numPages} title="Next">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </TBtn>
              <div className="w-px h-4 bg-white/20 mx-1"/>
            </>)}

            <TBtn onClick={() => zoom(-0.1)} title="Zoom out">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4"/>
              </svg>
            </TBtn>
            <span className="text-xs text-white/50 w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
            <TBtn onClick={() => zoom(0.1)} title="Zoom in">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
            </TBtn>

            <div className="w-px h-4 bg-white/20 mx-1"/>
            <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition" title="Download">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            </a>

            {onClose && (
              <TBtn onClick={onClose} title="Close" danger>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </TBtn>
            )}
          </div>
        </div>
      )}

      {/* ── Scroll container — does NOT handle mouse events ───────── */}
      <div className="flex-1 overflow-auto flex justify-center items-start p-8 select-none">
        {pdfError ? (
          <ErrState fileUrl={fileUrl} message={pdfError}/>
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={onLoadSuccess}
            onLoadError={onLoadError}
            loading={<LoadState/>}
            error={<ErrState fileUrl={fileUrl} message="Failed to load PDF"/>}
          >
            {/*
              wrapperRef is on THIS div.
              - Its size == PDF page size at current scale
              - All signature `left/top` values are relative to this div
              - All drag math uses this div's getBoundingClientRect()
              - Mouse events are on this div so they fire correctly
                even when cursor moves fast outside the signature img
            */}
            <div
              ref={wrapperRef}
              className="relative inline-block shadow-2xl"
              style={{ lineHeight: 0, cursor: isDragging ? 'grabbing' : 'default' }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />

              {signatures
                .filter(s => s.page_number === currentPage)
                .map(sig => (
                  <div
                    key={sig.id}
                    className="absolute z-10 select-none"
                    style={{
                      left:   sig.coordinates?.x ?? 80,
                      top:    sig.coordinates?.y ?? 80,
                      cursor: onPositionChange ? 'grab' : 'default',
                    }}
                    onMouseDown={onPositionChange ? e => handleMouseDown(e, sig) : undefined}
                  >
                    {sig.signature_data ? (
                      <img
                        src={sig.signature_data}
                        alt={`Sig – ${sig.signer_name}`}
                        draggable={false}
                        style={{
                          width:        `${SIG_W}px`,
                          height:       `${SIG_H}px`,
                          objectFit:    'contain',
                          objectPosition: 'left center',
                          display:      'block',
                          pointerEvents:'none',
                          filter:       'drop-shadow(0 1px 3px rgba(0,0,0,0.45))',
                          userSelect:   'none',
                        }}
                      />
                    ) : (
                      <div
                        style={{ width: SIG_W, height: SIG_H }}
                        className="flex items-center justify-center gap-1.5 bg-blue-500/70 backdrop-blur-sm text-white text-xs font-medium rounded border border-blue-400/40 shadow-lg"
                      >
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                        {sig.signer_name}
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

const TBtn = ({ onClick, disabled, title, danger, children }) => (
  <button onClick={onClick} disabled={disabled} title={title}
    className={`p-1.5 rounded transition disabled:opacity-30 disabled:cursor-not-allowed
      ${danger ? 'text-white/50 hover:text-red-400 hover:bg-red-500/20'
               : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
    {children}
  </button>
);

const LoadState = () => (
  <div className="flex flex-col items-center justify-center text-white/50 py-24 gap-4">
    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-blue-400 animate-spin"/>
    <span className="text-sm">Loading PDF…</span>
  </div>
);

const ErrState = ({ fileUrl, message }) => (
  <div className="flex flex-col items-center justify-center text-white/60 py-24 gap-3">
    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>
    <p className="text-sm font-medium text-white/70">{message}</p>
    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
      className="text-xs text-blue-400 hover:text-blue-300 underline">Open in browser</a>
  </div>
);

export default PDFViewer;