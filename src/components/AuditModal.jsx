import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const AuditModal = ({ document, onClose }) => {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => { fetchAudit(); }, [document.id]);

  const auth = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const fetchAudit = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await axios.get(
  `${API_URL}/api/audit/${document.id}`,
  auth()
);
      setLogs(data.data || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getActionDisplay = (action) => {
    const map = {
      DOCUMENT_UPLOADED:          { label: 'Document Uploaded',     color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',       icon: '📤' },
      DOCUMENT_VIEWED:            { label: 'Document Viewed',       color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',       icon: '👁' },
      SIGNATURE_CREATED:          { label: 'Signature Added',       color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: '➕' },
      SIGNATURE_SIGNED:           { label: 'Signature Signed',      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: '✅' },
      SIGNATURE_DELETED:          { label: 'Signature Deleted',     color: 'bg-red-500/15 text-red-400 border-red-500/30',         icon: '🗑' },
      SIGNING_LINK_SENT:          { label: 'Signing Link Sent',     color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: '📧' },
      PUBLIC_SIGNATURE_SUBMITTED: { label: 'External Signed',       color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: '✍️' },
      DOCUMENT_FINALIZED:         { label: 'Document Finalized',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: '🔒' },
      SIGNATURE_REJECTED:         { label: 'Signature Rejected',    color: 'bg-red-500/15 text-red-400 border-red-500/30',         icon: '❌' },
    };
    return map[action] || { label: action, color: 'bg-gray-500/15 text-gray-400 border-gray-500/30', icon: '•' };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Audit Trail</h2>
            <p className="text-sm text-gray-500 mt-0.5">{document.title || document.file_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin mb-4" />
              <p className="text-sm">Loading audit trail…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No audit entries yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, idx) => {
                const display = getActionDisplay(log.action);
                return (
                  <div
                    key={log.id}
                    className="flex gap-4 pb-4 border-b border-gray-100 last:border-0"
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <div className="text-xl">{display.icon}</div>
                      {idx < logs.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200 mt-2" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${display.color}`}>
                          {display.label}
                        </span>
                        <span className="text-xs text-gray-400 tabular-nums shrink-0">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>

                      {/* Details */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                          {log.details.signer_name && (
                            <p className="text-gray-600">
                              <span className="font-medium text-gray-800">Signer:</span> {log.details.signer_name}
                            </p>
                          )}
                          {log.details.signer_email && (
                            <p className="text-gray-600">
                              <span className="font-medium text-gray-800">Email:</span> {log.details.signer_email}
                            </p>
                          )}
                          {log.details.signatures_embedded && (
                            <p className="text-gray-600">
                              <span className="font-medium text-gray-800">Signatures:</span> {log.details.signatures_embedded}
                            </p>
                          )}
                          {log.details.rejection_reason && (
                            <p className="text-gray-600">
                              <span className="font-medium text-gray-800">Reason:</span> {log.details.rejection_reason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* IP + User Agent */}
                      <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                        {log.ip_address && (
                          <p className="font-mono">IP: {log.ip_address}</p>
                        )}
                        {log.user_agent && (
                          <p className="truncate" title={log.user_agent}>
                            {log.user_agent}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditModal;