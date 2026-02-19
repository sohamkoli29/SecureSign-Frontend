import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PDFViewer from './PDFViewer';
import SignaturePad from './SignaturePad';
import AuditTrailPanel from './AuditTrailPanel';

const SignaturePlacement = ({ document, onComplete }) => {
  const [signatures, setSignatures]       = useState([]);
  const [selectedSig, setSelectedSig]     = useState(null);
  const [showPad, setShowPad]             = useState(false);
  const [loading, setLoading]             = useState(false);
  const [finalizing, setFinalizing]       = useState(false);
  const [finalizedUrl, setFinalizedUrl]   = useState(document.signed_file_url || null);
  const [currentPage, setCurrentPage]     = useState(1);

  // Send-for-signature modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTargetSig, setSendTargetSig] = useState(null);
  const [sendName, setSendName]           = useState('');
  const [sendEmail, setSendEmail]         = useState('');
  const [sending, setSending]             = useState(false);
  const [sentLink, setSentLink]           = useState('');
  const [copySuccess, setCopySuccess]     = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetSig, setRejectTargetSig] = useState(null);
  const [rejectReason, setRejectReason]       = useState('');
  const [rejecting, setRejecting]             = useState(false);

  useEffect(() => { fetchSignatures(); }, [document.id]);
  const API_URL = import.meta.env.VITE_API_URL;
  const auth = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const fetchSignatures = async () => {
    try {
     const { data } = await axios.get(
  `${API_URL}/api/signatures/document/${document.id}`,
  auth()
);
      setSignatures(data.data || []);
    } catch (e) { console.error('fetchSignatures:', e); }
  };

  /* ── Add placeholder (pending, no signature data — for external signing) ── */
  const handleAddPlaceholder = async () => {
    try {
      setLoading(true);
    await axios.post(
  `${API_URL}/api/signatures`,
  {
    document_id: document.id,
    signer_name: 'Signer',
    coordinates: { x: 80, y: 80, width: 220, height: 110 },
    page_number: currentPage,
    signature_data: null,
    status: 'pending',
  },
  auth()
);
      await fetchSignatures();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to add placeholder');
    } finally { setLoading(false); }
  };

  /* ── Save / apply signature (Sign Myself flow only) ─────────── */
  const handleSignatureSave = async (signatureData) => {
    try {
      setLoading(true);
      if (selectedSig) {
        // Signing an existing pending placeholder
        await axios.patch(
          `${API_URL}/api/signatures/${selectedSig.id}/status`,
          { status: 'signed', signature_data: signatureData },
          auth()
        );
      } else {
        // Creating a new signature directly (Sign Myself — signed immediately)
        await axios.post(`${API_URL}/api/signatures`, {
          document_id:    document.id,
          signer_name:    'Me',
          coordinates:    { x: 80, y: 80, width: 220, height: 110 },
          page_number:    currentPage,
          signature_data: signatureData,
          status:         'signed',
        }, auth());
      }
      setShowPad(false);
      setSelectedSig(null);
      await fetchSignatures();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to save signature');
    } finally { setLoading(false); }
  };

  /* ── Accept signature ────────────────────────────────────────── */
  const handleAccept = async (sig) => {
    if (!window.confirm(`Accept signature from ${sig.signer_name}?`)) return;
    try {
      setLoading(true);
      await axios.patch(
        `${API_URL}/api/signatures/${sig.id}/status`,
        { status: 'signed' },
        auth()
      );
      await fetchSignatures();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to accept signature');
    } finally { setLoading(false); }
  };

  /* ── Reject signature ────────────────────────────────────────── */
  const openRejectModal = (sig) => {
    setRejectTargetSig(sig);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      setRejecting(true);
      await axios.patch(
        `${API_URL}/api/signatures/${rejectTargetSig.id}/status`,
        { 
          status: 'rejected', 
          rejection_reason: rejectReason.trim(),
          notify_signer: true  // ← tells backend to send email
        },
        auth()
      );
      setShowRejectModal(false);
      setRejectTargetSig(null);
      setRejectReason('');
      await fetchSignatures();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to reject signature');
    } finally { setRejecting(false); }
  };

  /* ── Delete ──────────────────────────────────────────────────── */
  const handleDelete = async (sigId) => {
    if (!window.confirm('Delete this signature?')) return;
    try {
      await axios.delete(`${API_URL}/api/signatures/${sigId}`, auth());
      await fetchSignatures();
    } catch (e) { alert('Failed to delete'); }
  };

  /* ── Finalize ────────────────────────────────────────────────── */
  const handleFinalize = async () => {
    const n = signatures.filter(s => s.status === 'signed').length;
    if (n === 0) { alert('Sign at least one signature before finalizing.'); return; }
    if (!window.confirm(`Burn ${n} signature(s) into PDF permanently?`)) return;
    try {
      setFinalizing(true);
      const { data } = await axios.post(`${API_URL}/api/documents/${document.id}/finalize`, {}, auth());
      const url = data.data.signed_file_url;
      setFinalizedUrl(url);
      triggerDownload(url, `signed-${document.title || document.file_name}`);
    } catch (e) {
      alert(e.response?.data?.error || 'Finalization failed.');
    } finally { setFinalizing(false); }
  };

  const triggerDownload = (url, name) => {
    const a = window.document.createElement('a');
    a.href = url;
    a.download = name.endsWith('.pdf') ? name : `${name}.pdf`;
    a.target = '_blank';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  /* ── Send-for-signature ──────────────────────────────────────── */
  const openSendModal = (sig) => {
    const pending = signatures.filter(s => s.status !== 'signed');
    const target  = sig?.id ? sig : (pending.length === 1 ? pending[0] : null);
    setSendTargetSig(target);
    setSendName(target && target.signer_name !== 'Signer' ? target.signer_name : '');
    setSendEmail(target?.signer_email || '');
    setSentLink('');
    setCopySuccess(false);
    setShowSendModal(true);
  };

  const handleSendLink = async () => {
    if (!sendName.trim()) { alert("Please enter the signer's name"); return; }

    const target = sendTargetSig?.id
      ? sendTargetSig
      : signatures.find(s => s.status !== 'signed');

    if (!target?.id) {
      alert('No pending signature placeholder found. Add a placeholder first.');
      return;
    }

    try {
      setSending(true);
      const { data } = await axios.post(
        `${API_URL}/api/signatures/${target.id}/send-link`,
        { signer_name: sendName, signer_email: sendEmail },
        auth()
      );
      setSentLink(data.public_url);
      await fetchSignatures();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to generate signing link');
    } finally { setSending(false); }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sentLink);
    } catch {
      const el = window.document.createElement('textarea');
      el.value = sentLink;
      window.document.body.appendChild(el);
      el.select();
      window.document.execCommand('copy');
      window.document.body.removeChild(el);
    }
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  /* ── Drag position callbacks ─────────────────────────────────── */
  const handlePositionChange = (sigId, coords) => {
    if (!coords) { fetchSignatures(); return; }
    setSignatures(prev =>
      prev.map(s => s.id === sigId ? { ...s, coordinates: coords } : s)
    );
  };

  const handlePositionSaved = async (sigId, coords) => {
    setSignatures(prev =>
      prev.map(s => s.id === sigId ? { ...s, coordinates: coords } : s)
    );
    try {
      await axios.put(
        `${API_URL}/api/signatures/${sigId}/position`,
        { coordinates: coords, page_number: currentPage },
        auth()
      );
    } catch (e) {
      await fetchSignatures();
    }
  };

  /* ── Derived state ───────────────────────────────────────────── */
  const signedCount    = signatures.filter(s => s.status === 'signed').length;
  const pendingCount   = signatures.filter(s => s.status === 'pending').length;
  const rejectedCount  = signatures.filter(s => s.status === 'rejected').length;
  const allSigned      = signatures.length > 0 && pendingCount === 0 && rejectedCount === 0;
  const hasRejected    = rejectedCount > 0;
  const rejectedSigs   = signatures.filter(s => s.status === 'rejected');

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f1a]">

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 bg-[#16213e] border-r border-white/10 flex flex-col">

        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
          <div>
            <h2 className="text-sm font-bold text-white">Signatures</h2>
            <p className="text-xs text-white/40 mt-0.5 truncate max-w-[160px]">{document.title}</p>
          </div>
          <button onClick={() => window.location.href = '/dashboard'}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition">
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="flex border-b border-white/10 divide-x divide-white/10">
          {[
            { label: 'Total',    value: signatures.length, color: 'text-white'       },
            { label: 'Pending',  value: pendingCount,      color: 'text-yellow-400'  },
            { label: 'Signed',   value: signedCount,       color: 'text-emerald-400' },
            { label: 'Rejected', value: rejectedCount,     color: 'text-red-400'     },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 flex flex-col items-center py-2.5">
              <span className={`text-lg font-bold leading-none ${color}`}>{value}</span>
              <span className="text-xs text-white/30 mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* Ready to finalize banner */}
        {allSigned && (
          <div className="mx-3 mt-3 px-3 py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg">
            <p className="text-xs text-emerald-400 font-medium">✅ All signatures complete</p>
            <p className="text-xs text-emerald-400/60 mt-0.5">Ready to finalize document</p>
          </div>
        )}

        {/* Document rejected banner */}
        {hasRejected && (
          <div className="mx-3 mt-3 px-3 py-2.5 bg-red-500/15 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400 font-medium">❌ Document Rejected</p>
            <p className="text-xs text-red-400/60 mt-1.5">
              {rejectedSigs.length} signature{rejectedSigs.length > 1 ? 's' : ''} rejected:
            </p>
            <div className="mt-2 space-y-1.5">
              {rejectedSigs.map(sig => (
                <div key={sig.id} className="text-xs text-red-300 bg-red-500/10 rounded px-2 py-1.5 border border-red-500/20">
                  <p className="font-medium">{sig.signer_name}</p>
                  {sig.rejection_reason && (
                    <p className="text-red-400/80 mt-0.5 italic">"{sig.rejection_reason}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="p-3 space-y-2 border-b border-white/10">

          {/* Add placeholder */}
          <button onClick={handleAddPlaceholder}
            disabled={loading || finalizing}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Add Signature
          </button>

          {signedCount > 0 && (
            <button onClick={handleFinalize} disabled={finalizing || loading}
              className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
              {finalizing
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Finalizing…</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>Finalize & Download</>
              }
            </button>
          )}

          {finalizedUrl && !finalizing && (
            <a href={finalizedUrl} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/15 text-white/80 text-sm rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Download Signed PDF
            </a>
          )}
        </div>

        {/* Signature list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {signatures.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-white/30 py-12 gap-2">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              <p className="text-xs text-center">No signatures yet.<br/>Click "Add Placeholder".</p>
            </div>
          ) : signatures.map(sig => (
            <SigCard
              key={sig.id}
              sig={sig}
              onSign={() => { setSelectedSig(sig); setShowPad(true); }}
              onSend={() => openSendModal(sig)}
              onAccept={() => handleAccept(sig)}
              onReject={() => openRejectModal(sig)}
              onDelete={() => handleDelete(sig.id)}
            />
          ))}
        </div>

        {/* Audit trail panel */}
        <AuditTrailPanel documentId={document.id} />

        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-white/25 text-center">Drag signatures on the PDF to reposition</p>
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
          onPositionChange={handlePositionChange}
          onPositionSaved={handlePositionSaved}
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

      {/* ── Send for Signature modal ──────────────────────────────── */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowSendModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-bold text-gray-900">Send for Signature</h2>
                <p className="text-xs text-gray-400 mt-0.5">Generate a link — no account required</p>
              </div>
              <button onClick={() => setShowSendModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!sentLink ? (
                <>
                  {signatures.filter(s => s.status !== 'signed').length > 1 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Signature Placeholder <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={sendTargetSig?.id || ''}
                        onChange={e => {
                          const sig = signatures.find(s => s.id === e.target.value);
                          setSendTargetSig(sig || null);
                        }}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a signature placeholder…</option>
                        {signatures.filter(s => s.status !== 'signed').map(s => (
                          <option key={s.id} value={s.id}>
                            Page {s.page_number} — {s.signer_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Signer Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={sendName} onChange={e => setSendName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Signer Email <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div className="flex gap-2.5 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="text-blue-500 shrink-0">ℹ️</span>
                    <p className="text-xs text-blue-700">Link expires in 7 days. Share only with the intended signer.</p>
                  </div>

                  <button onClick={handleSendLink} disabled={sending || !sendName.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition">
                    {sending
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
                      : 'Generate Signing Link'
                    }
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-emerald-600">✅</span>
                    <p className="text-sm text-emerald-700 font-medium">
                      {sendEmail ? `Email sent to ${sendEmail}` : 'Signing link generated!'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Signing Link</label>
                    <div className="flex gap-2">
                      <input type="text" value={sentLink} readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 font-mono focus:outline-none" />
                      <button onClick={handleCopyLink}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition shrink-0 ${
                          copySuccess ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'
                        }`}>
                        {copySuccess ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400">
                    Share with <strong className="text-gray-600">{sendName}</strong>. Expires in 7 days.
                  </p>

                  <button onClick={() => setShowSendModal(false)}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ──────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowRejectModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-bold text-gray-900">Reject Signature</h2>
                <p className="text-xs text-gray-400 mt-0.5">Provide a reason for rejection</p>
              </div>
              <button onClick={() => setShowRejectModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Rejecting signature from: <strong>{rejectTargetSig?.signer_name}</strong>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g., Document contains errors, missing information, incorrect terms..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 p-3 bg-red-50 rounded-lg border border-red-100">
                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <p className="text-xs text-red-700">
                  This will mark the signature as rejected. The signer will need to be notified separately.
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition">
                  Cancel
                </button>
                <button onClick={handleReject} disabled={rejecting || !rejectReason.trim()}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
                  {rejecting
                    ? <div className="w-4 h-4 mx-auto border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : 'Reject Signature'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading overlay ───────────────────────────────────────── */}
      {(loading || finalizing) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-5 flex items-center gap-3 shadow-2xl">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"/>
            <span className="text-sm font-medium text-gray-700">
              {finalizing ? 'Generating signed PDF…' : 'Saving…'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Signature card ──────────────────────────────────────────────── */
const SigCard = ({ sig, onSign, onSend, onAccept, onReject, onDelete }) => {
  const statusStyle = {
    signed:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
    pending:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  }[sig.status] || 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 hover:border-white/20 transition">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white truncate">{sig.signer_name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle}`}>
          {sig.status}
        </span>
      </div>

      {sig.signature_data && (
        <div className="mb-2 rounded-lg bg-white/10 flex items-center justify-center" style={{ height: 44 }}>
          <img src={sig.signature_data} alt="sig"
            className="max-h-full max-w-full object-contain"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}/>
        </div>
      )}

      {sig.status === 'rejected' && sig.rejection_reason && (
        <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-300 font-medium mb-0.5">Rejection reason:</p>
          <p className="text-xs text-red-400/80 italic">"{sig.rejection_reason}"</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs text-white/30">Page {sig.page_number}</span>
        <div className="flex items-center gap-2">
          {sig.link_sent && (
            <span className="text-xs text-yellow-400/60" title="Position locked (link sent)">
              🔒
            </span>
          )}
          <span className="text-xs text-white/25 font-mono">
            {Math.round(sig.coordinates?.x ?? 0)}, {Math.round(sig.coordinates?.y ?? 0)}
          </span>
        </div>
      </div>

      <div className="flex gap-1.5">
        {sig.status === 'pending' && (
          <>
            <button onClick={onSign}
              className="flex-1 text-xs py-1.5 bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 rounded-lg transition font-medium">
              Sign
            </button>
            <button onClick={onSend}
              className="flex-1 text-xs py-1.5 bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 rounded-lg transition font-medium">
              Send
            </button>
          </>
        )}
        {sig.status === 'signed' && sig.signature_data && (
          <>
            <button onClick={onAccept}
              className="flex-1 text-xs py-1.5 bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 rounded-lg transition font-medium">
              Accept
            </button>
            <button onClick={onReject}
              className="flex-1 text-xs py-1.5 bg-red-600/30 text-red-300 hover:bg-red-600/50 rounded-lg transition font-medium">
              Reject
            </button>
          </>
        )}
        <button onClick={onDelete}
          className="text-xs py-1.5 px-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/35 rounded-lg transition">
          Del
        </button>
      </div>
    </div>
  );
};

export default SignaturePlacement;