import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * AuditTrailPanel
 * Collapsible section that shows audit log entries for a document
 * Displays in SignaturePlacement sidebar below signature list
 */
const AuditTrailPanel = ({ documentId }) => {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (expanded && logs.length === 0) {
      fetchAudit();
    }
  }, [expanded]);

  const auth = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  const fetchAudit = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await axios.get(`/api/audit/${documentId}`, auth());
      setLogs(data.data || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000); // seconds

    if (diff < 60)  return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActionDisplay = (action) => {
    const map = {
      DOCUMENT_UPLOADED:       { label: 'Uploaded',           color: 'text-blue-400',    icon: '📤' },
      DOCUMENT_VIEWED:         { label: 'Viewed',             color: 'text-blue-400',    icon: '👁' },
      SIGNATURE_CREATED:       { label: 'Signature added',    color: 'text-purple-400',  icon: '➕' },
      SIGNATURE_SIGNED:        { label: 'Signed',             color: 'text-emerald-400', icon: '✅' },
      SIGNATURE_DELETED:       { label: 'Signature deleted',  color: 'text-red-400',     icon: '🗑' },
      SIGNING_LINK_SENT:       { label: 'Link sent',          color: 'text-purple-400',  icon: '📧' },
      PUBLIC_SIGNATURE_SUBMITTED: { label: 'External signed', color: 'text-emerald-400', icon: '✍️' },
      DOCUMENT_FINALIZED:      { label: 'Finalized',          color: 'text-emerald-400', icon: '🔒' },
      SIGNATURE_REJECTED:      { label: 'Rejected',           color: 'text-red-400',     icon: '❌' },
    };
    return map[action] || { label: action, color: 'text-white/50', icon: '•' };
  };

  return (
    <div className="border-t border-white/10">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Audit Trail</span>
        </div>
        <svg
          className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-white/30 text-xs">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mr-2" />
              Loading…
            </div>
          ) : error ? (
            <div className="py-4 text-center text-xs text-red-400">{error}</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/30">No audit entries yet</div>
          ) : (
            <div className="space-y-1.5">
              {logs.map(log => {
                const display = getActionDisplay(log.action);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                  >
                    <span className="text-sm shrink-0 mt-0.5">{display.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${display.color} leading-tight`}>
                        {display.label}
                      </p>
                      <p className="text-xs text-white/30 mt-0.5">{formatTime(log.created_at)}</p>
                      {log.details?.signer_name && (
                        <p className="text-xs text-white/40 mt-0.5">by {log.details.signer_name}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditTrailPanel;