import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import PDFViewer from '../components/PDFViewer';
import SignaturePad from '../components/SignaturePad';

const PublicSignPage = () => {
  const { token } = useParams();

  const [state, setState]             = useState('loading'); // loading | ready | signed | expired | error
  const [sigRequest, setSigRequest]   = useState(null);
  const [showPad, setShowPad]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMsg, setErrorMsg]       = useState('');

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason]       = useState('');
  const [rejecting, setRejecting]             = useState(false);

  // Keep doc title available even after signing (when sigRequest is cleared)
  const [docTitle, setDocTitle]       = useState('');
  const [signerName, setSignerName]   = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => { loadRequest(); }, [token]);

  const loadRequest = async () => {
    try {
      const { data } = await axios.get(
        `${API_URL}/api/signatures/public/${token}`
      );

      if (data.already_signed) {
        // Store name before clearing sigRequest
        setSignerName(data.signer_name || '');
        setState('signed');
        return;
      }

      setSigRequest(data);
      setDocTitle(data.document?.title || data.document?.file_name || 'Document');
      setSignerName(data.signature?.signer_name || '');
      setCurrentPage(data.signature?.page_number || 1);
      setState('ready');
    } catch (err) {
      const status = err.response?.status;
      if (status === 410 || status === 404) { setState('expired'); return; }
      setErrorMsg(err.response?.data?.error || 'Something went wrong');
      setState('error');
    }
  };

  const handleSignatureSave = async (signatureData) => {
    try {
      setSubmitting(true);
      await axios.post(
        `${API_URL}/api/signatures/public/${token}/sign`,
        { signature_data: signatureData }
      );
      setShowPad(false);
      // Keep sigRequest intact so success screen can show doc title
      setState('signed');
    } catch (err) {
      setSubmitting(false);
      alert(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      setRejecting(true);
      await axios.post(
        `${API_URL}/api/signatures/public/${token}/reject`,
        { rejection_reason: rejectReason.trim() }
      );
      setShowRejectModal(false);
      setState('rejected');
    } catch (err) {
      setRejecting(false);
      alert(err.response?.data?.error || 'Failed to submit rejection');
    } finally {
      setRejecting(false);
    }
  };

  // Signature placeholder shown on PDF before signing
  const signatures = sigRequest ? [{
    ...sigRequest.signature,
    status:         'pending',
    signature_data: null,
  }] : [];

  /* ── States ───────────────────────────────────────────────────── */

  if (state === 'loading') {
    return <FullScreenMessage icon="⏳" title="Loading…" subtitle="Verifying your signing link" />;
  }

  if (state === 'expired') {
    return (
      <FullScreenMessage
        icon="⏰"
        title="Link Expired"
        subtitle="This signing link is no longer valid. Please contact the document owner to request a new link."
      />
    );
  }

  if (state === 'error') {
    return <FullScreenMessage icon="❌" title="Invalid Link" subtitle={errorMsg || 'This signing link is invalid.'} />;
  }

  if (state === 'signed') {
    // Use sigRequest if still available (just signed), or fall back to stored values
    const title = sigRequest?.document?.title || sigRequest?.document?.file_name || docTitle;
    const name  = sigRequest?.signature?.signer_name || signerName;

    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-10 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Document Signed!</h1>
          <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
            Thank you{name ? `, ${name}` : ''}. Your signature has been recorded.
            The document owner will be notified.
          </p>

          {title && (
            <div className="mt-4 sm:mt-6 px-4 sm:px-5 py-3 sm:py-4 bg-gray-50 rounded-xl text-left border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Document</p>
              <p className="text-sm font-semibold text-gray-800 break-words">{title}</p>
            </div>
          )}

          <div className="mt-4 sm:mt-6 px-4 sm:px-5 py-3 sm:py-4 bg-blue-50 rounded-xl text-left border border-blue-100">
            <p className="text-xs text-blue-600 font-medium">✅ What happens next?</p>
            <p className="text-xs text-blue-500 mt-1 leading-relaxed">
              The document owner will receive your signature and can download the final signed PDF.
              You can safely close this tab.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'rejected') {
    const title = sigRequest?.document?.title || sigRequest?.document?.file_name || docTitle;
    const name  = sigRequest?.signature?.signer_name || signerName;

    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-10 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Request Rejected</h1>
          <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
            {name ? `${name}, you` : 'You'} have rejected the signature request. The document owner has been notified.
          </p>

          {title && (
            <div className="mt-4 sm:mt-6 px-4 sm:px-5 py-3 sm:py-4 bg-gray-50 rounded-xl text-left border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Document</p>
              <p className="text-sm font-semibold text-gray-800 break-words">{title}</p>
            </div>
          )}

          <div className="mt-4 sm:mt-6 px-4 sm:px-5 py-3 sm:py-4 bg-red-50 rounded-xl text-left border border-red-100">
            <p className="text-xs text-red-600 font-medium">Your rejection reason has been sent to the document owner.</p>
            <p className="text-xs text-red-500 mt-1 leading-relaxed">
              You can safely close this tab.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Ready state ───────────────────────────────────────────────── */
  const doc     = sigRequest.document;
  const sig     = sigRequest.signature;
  const expires = new Date(sig.expires_at);

  return (
    <div className="flex flex-col h-screen bg-[#0f0f1a] overflow-hidden">

      {/* Top bar - Responsive design */}
      <div className="shrink-0 bg-[#16213e] border-b border-white/10 px-3 sm:px-4 md:px-6 py-2 sm:py-3">
        {/* Mobile layout (stacked) */}
        <div className="flex flex-col sm:hidden space-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-blue-600/30 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{doc.title || doc.file_name}</p>
              <p className="text-xs text-white/40 truncate">
                For {sig.signer_name} · Expires {expires.toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>

            <button
              onClick={() => setShowPad(true)}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              Sign
            </button>
          </div>
        </div>

        {/* Desktop/tablet layout (horizontal) */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-blue-600/30 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate max-w-[200px] md:max-w-xs lg:max-w-md">{doc.title || doc.file_name}</p>
              <p className="text-xs text-white/40">
                Requested for <span className="text-white/60">{sig.signer_name}</span>
                <span className="mx-1.5 text-white/20">·</span>
                <span className="text-white/30">Expires {expires.toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={submitting}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs md:text-sm font-semibold rounded-lg transition disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
              <span className="hidden xs:inline">Reject</span>
            </button>

            <button
              onClick={() => setShowPad(true)}
              disabled={submitting}
              className="flex items-center gap-2 px-3 md:px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-semibold rounded-lg transition disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              <span>Sign Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Instruction banner - Responsive */}
      <div className="shrink-0 bg-blue-600/10 border-b border-blue-500/20 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p className="text-xs text-blue-300 leading-relaxed">
          <span className="hidden xs:inline">Review the document below. </span>
          The <span className="text-blue-200 font-medium">blue box</span> shows where your signature will appear.
          <span className="hidden sm:inline"> When ready, click</span>
          <strong className="text-blue-200 hidden sm:inline"> "Sign Document"</strong>
          <span className="hidden sm:inline"> in the top-right.</span>
        </p>
      </div>

      {/* PDF viewer */}
      <div className="flex-1 overflow-hidden">
        <PDFViewer
          fileUrl={doc.file_url}
          fileName={doc.title || doc.file_name}
          signatures={signatures}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showToolbar={false}
          height="100%"
        />
      </div>

      {/* Signature pad - Responsive */}
      {showPad && (
        <SignaturePad
          onSave={handleSignatureSave}
          onClose={() => setShowPad(false)}
        />
      )}

      {/* Reject modal - Responsive */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowRejectModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b z-10">
              <div>
                <h2 className="font-bold text-gray-900 text-sm sm:text-base">Reject Signing Request</h2>
                <p className="text-xs text-gray-400 mt-0.5">Provide a reason for the document owner</p>
              </div>
              <button onClick={() => setShowRejectModal(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g., Unable to verify information, incorrect details, missing required sections..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 p-3 bg-red-50 rounded-lg border border-red-100">
                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <p className="text-xs text-red-700">
                  The document owner will receive your rejection reason and be notified immediately.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition">
                  Cancel
                </button>
                <button onClick={handleReject} disabled={rejecting || !rejectReason.trim()}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-lg transition">
                  {rejecting
                    ? <div className="w-4 h-4 mx-auto border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : 'Confirm Rejection'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-3 shadow-2xl">
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"/>
            <span className="text-xs sm:text-sm font-medium text-gray-700">Submitting your signature…</span>
          </div>
        </div>
      )}
    </div>
  );
};

const FullScreenMessage = ({ icon, title, subtitle }) => (
  <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 sm:p-6">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-10 text-center">
      <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">{icon}</div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">{title}</h1>
      <p className="text-sm sm:text-base text-gray-500 leading-relaxed">{subtitle}</p>
    </div>
  </div>
);

export default PublicSignPage;