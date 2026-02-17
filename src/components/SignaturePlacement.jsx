import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PDFViewer from './PDFViewer';
import SignaturePad from './SignaturePad';

/**
 * SignaturePlacement
 * Full signing UI: sidebar to manage signatures + PDFViewer with
 * transparent overlays and drag-and-drop repositioning.
 */
const SignaturePlacement = ({ document, onComplete }) => {
  const [signatures, setSignatures]       = useState([]);
  const [selectedSig, setSelectedSig]     = useState(null);
  const [showPad, setShowPad]             = useState(false);
  const [loading, setLoading]             = useState(false);
  const [currentPage, setCurrentPage]     = useState(1);
  const [draggingId, setDraggingId]       = useState(null);
  const dragOffset                        = useRef({ x: 0, y: 0 });

  useEffect(() => { fetchSignatures(); }, [document.id]);

  /* ── API ─────────────────────────────────────────────────────── */

  const auth = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchSignatures = async () => {
    try {
      const { data } = await axios.get(
        `/api/signatures/document/${document.id}`, auth()
      );
      setSignatures(data.data || []);
    } catch (e) {
      console.error('fetchSignatures error:', e);
    }
  };

  const handleSignatureSave = async (signatureData) => {
    try {
      setLoading(true);

      if (selectedSig) {
        // Applying signature image to an existing placeholder
        await axios.patch(
          `/api/signatures/${selectedSig.id}/status`,
          { status: 'signed', signature_data: signatureData },
          auth()
        );
      } else {
        // Brand-new signature — placed at default position
        await axios.post('/api/signatures', {
          document_id:    document.id,
          signer_name:    'Signer',
          signer_email:   '',
          coordinates:    { x: 80, y: 80 },
          page_number:    currentPage,
          signature_data: signatureData,
        }, auth());
      }

      setShowPad(false);
      setSelectedSig(null);
      await fetchSignatures();
    } catch (e) {
      console.error('handleSignatureSave error:', e);
      alert(e.response?.data?.error || 'Failed to save signature');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sigId) => {
    if (!window.confirm('Delete this signature?')) return;
    try {
      await axios.delete(`/api/signatures/${sigId}`, auth());
      await fetchSignatures();
    } catch (e) {
      alert('Failed to delete signature');
    }
  };

  /* ── Drag ────────────────────────────────────────────────────── */

  const handleDragStart = (e, sig) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDraggingId(sig.id);
  };

  const handleDragMove = (e) => {
    if (!draggingId) return;

    // Find the PDF page element to use as coordinate origin
    const pageEl = window.document.querySelector('.react-pdf__Page');
    if (!pageEl) return;

    const rect = pageEl.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragOffset.current.x);
    const y = Math.max(0, e.clientY - rect.top  - dragOffset.current.y);

    setSignatures(prev =>
      prev.map(s => s.id === draggingId ? { ...s, coordinates: { x, y } } : s)
    );
  };

  const handleDragEnd = async () => {
    if (!draggingId) return;
    const sig = signatures.find(s => s.id === draggingId);
    setDraggingId(null);
    if (!sig) return;

    try {
      await axios.put(
        `/api/signatures/${sig.id}/position`,
        { coordinates: sig.coordinates, page_number: sig.page_number },
        auth()
      );
    } catch (e) {
      console.error('handleDragEnd position save error:', e);
      await fetchSignatures(); // revert optimistic update
    }
  };

  /* ── Render ──────────────────────────────────────────────────── */

  const pending  = signatures.filter(s => s.status === 'pending');
  const signed   = signatures.filter(s => s.status === 'signed');

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f1a]">

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 bg-[#16213e] border-r border-white/10 flex flex-col">

        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
          <div>
            <h2 className="text-sm font-bold text-white">Signatures</h2>
            <p className="text-xs text-white/40 mt-0.5 truncate max-w-[160px]" title={document.title}>
              {document.title}
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition text-xs"
            title="Back to dashboard"
          >
            ✕
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex border-b border-white/10 divide-x divide-white/10">
          {[
            { label: 'Total',   value: signatures.length, color: 'text-white'       },
            { label: 'Pending', value: pending.length,    color: 'text-yellow-400'  },
            { label: 'Signed',  value: signed.length,     color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 flex flex-col items-center py-2.5">
              <span className={`text-lg font-bold leading-none ${color}`}>{value}</span>
              <span className="text-xs text-white/30 mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* Add button */}
        <div className="p-3 border-b border-white/10">
          <button
            onClick={() => { setSelectedSig(null); setShowPad(true); }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Signature
          </button>
        </div>

        {/* Signature list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {signatures.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-white/30 py-12 gap-2">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <p className="text-xs text-center">No signatures yet.<br />Click "Add Signature" to begin.</p>
            </div>
          ) : (
            signatures.map(sig => (
              <SigCard
                key={sig.id}
                sig={sig}
                onSign={() => { setSelectedSig(sig); setShowPad(true); }}
                onDelete={() => handleDelete(sig.id)}
              />
            ))
          )}
        </div>

        {/* Drag tip */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-white/25 text-center">
            Drag signatures on the PDF to reposition them
          </p>
        </div>
      </aside>

      {/* ── PDF Viewer ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        <PDFViewer
          fileUrl={document.file_url}
          fileName={document.title || document.file_name}
          signatures={signatures}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          draggingId={draggingId}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          showToolbar
          height="100vh"
        />
      </main>

      {/* ── Signature Pad modal ───────────────────────────────────── */}
      {showPad && (
        <SignaturePad
          onSave={handleSignatureSave}
          onClose={() => { setShowPad(false); setSelectedSig(null); }}
        />
      )}

      {/* ── Loading overlay ───────────────────────────────────────── */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-5 flex items-center gap-3 shadow-2xl">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700">Saving…</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Signature card sub-component ────────────────────────────────── */
const SigCard = ({ sig, onSign, onDelete }) => {
  const statusStyle = {
    signed:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/15     text-red-400     border-red-500/30',
    pending:  'bg-yellow-500/15  text-yellow-400  border-yellow-500/30',
  }[sig.status] || 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 hover:border-white/20 transition">

      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white truncate">{sig.signer_name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle}`}>
          {sig.status}
        </span>
      </div>

      {/* Signature image preview */}
      {sig.signature_data && (
        <div className="mb-2 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center"
          style={{ height: 44 }}>
          <img
            src={sig.signature_data}
            alt="sig"
            className="max-h-full max-w-full object-contain"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
          />
        </div>
      )}

      {/* Coords */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs text-white/30">Page {sig.page_number}</span>
        <span className="text-xs text-white/25 font-mono">
          {Math.round(sig.coordinates?.x ?? 0)}, {Math.round(sig.coordinates?.y ?? 0)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        {sig.status !== 'signed' && (
          <button onClick={onSign}
            className="flex-1 text-xs py-1.5 bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 rounded-lg transition font-medium"
          >
            Sign
          </button>
        )}
        <button onClick={onDelete}
          className="text-xs py-1.5 px-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/35 rounded-lg transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default SignaturePlacement;