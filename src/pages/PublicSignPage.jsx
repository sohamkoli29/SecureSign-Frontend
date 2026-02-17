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

  // Keep doc title available even after signing (when sigRequest is cleared)
  const [docTitle, setDocTitle]       = useState('');
  const [signerName, setSignerName]   = useState('');

  useEffect(() => { loadRequest(); }, [token]);

  const loadRequest = async () => {
    try {
      const { data } = await axios.get(`/api/signatures/public/${token}`);

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
      await axios.post(`/api/signatures/public/${token}/sign`, { signature_data: signatureData });
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
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Signed!</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Thank you{name ? `, ${name}` : ''}. Your signature has been recorded.
            The document owner will be notified.
          </p>

          {title && (
            <div className="mt-6 px-5 py-4 bg-gray-50 rounded-xl text-left border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Document</p>
              <p className="text-sm font-semibold text-gray-800">{title}</p>
            </div>
          )}

          <div className="mt-6 px-5 py-4 bg-blue-50 rounded-xl text-left border border-blue-100">
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

  /* ── Ready state ───────────────────────────────────────────────── */
  const doc     = sigRequest.document;
  const sig     = sigRequest.signature;
  const expires = new Date(sig.expires_at);

  return (
    <div className="flex flex-col h-screen bg-[#0f0f1a]">

      {/* Top bar */}
      <div className="shrink-0 bg-[#16213e] border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-blue-600/30 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{doc.title || doc.file_name}</p>
            <p className="text-xs text-white/40">
              Requested for <span className="text-white/60">{sig.signer_name}</span>
              <span className="mx-1.5 text-white/20">·</span>
              <span className="text-white/30">Expires {expires.toLocaleDateString()}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPad(true)}
          disabled={submitting}
          className="shrink-0 flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
          Sign Document
        </button>
      </div>

      {/* Instruction banner */}
      <div className="shrink-0 bg-blue-600/10 border-b border-blue-500/20 px-6 py-2.5 flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p className="text-xs text-blue-300">
          Review the document below. The <span className="text-blue-200 font-medium">blue box</span> shows
          where your signature will appear. When ready, click
          <strong className="text-blue-200"> "Sign Document"</strong> in the top-right.
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

      {/* Signature pad */}
      {showPad && (
        <SignaturePad
          onSave={handleSignatureSave}
          onClose={() => setShowPad(false)}
        />
      )}

      {/* Submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-5 flex items-center gap-3 shadow-2xl">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"/>
            <span className="text-sm font-medium text-gray-700">Submitting your signature…</span>
          </div>
        </div>
      )}
    </div>
  );
};

const FullScreenMessage = ({ icon, title, subtitle }) => (
  <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-10 text-center">
      <div className="text-6xl mb-6">{icon}</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
      <p className="text-gray-500 text-sm leading-relaxed">{subtitle}</p>
    </div>
  </div>
);

export default PublicSignPage;