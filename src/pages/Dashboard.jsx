import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import UploadModal from '../components/UploadModal';
import DocumentPreview from '../components/DocumentPreview';
import AuditModal from '../components/AuditModal';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CircleStackIcon,
} from '@heroicons/react/24/solid';
import { DocumentCheckIcon } from '@heroicons/react/20/solid';

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [documents, setDocuments]           = useState([]);
  const [filteredDocs, setFilteredDocs]     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, signed: 0, rejected: 0, totalSize: 0 });
  const [filter, setFilter]       = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy]       = useState('newest');
  const [auditDocument, setAuditDocument] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  useEffect(() => { fetchDocuments(); fetchStats(); }, []);
  useEffect(() => { filterAndSortDocuments(); }, [documents, filter, searchQuery, sortBy]);

  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const fetchDocuments = async () => {
    try {
      const { data } = await axios.get(
  `${API_URL}/api/documents`,
  auth()
);
      setDocuments(data.data || []);
    } catch (e) { console.error('fetchDocuments:', e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
     const { data } = await axios.get(
  `${API_URL}/api/documents/stats`,
  auth()
);
      setStats(data.data);
    } catch (e) { console.error('fetchStats:', e); }
  };

  const filterAndSortDocuments = () => {
    let filtered = [...documents];
    if (filter !== 'all') filtered = filtered.filter(d => d.status === filter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.title?.toLowerCase().includes(q) ||
        d.file_name?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => ({
      newest: new Date(b.created_at) - new Date(a.created_at),
      oldest: new Date(a.created_at) - new Date(b.created_at),
      name:   (a.title || '').localeCompare(b.title || ''),
      size:   (b.file_size || 0) - (a.file_size || 0),
    }[sortBy] ?? 0));
    setFilteredDocs(filtered);
  };

  const handleUploadSuccess = (doc) => { setDocuments(p => [doc, ...p]); fetchStats(); };

  const handleLogout = () => {
    ['token', 'refreshToken', 'user'].forEach(k => localStorage.removeItem(k));
    setUser(null);
    navigate('/login');
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await axios.delete(
  `${API_URL}/api/documents/${docId}`,
  auth()
);
      setDocuments(p => p.filter(d => d.id !== docId));
      fetchStats();
    } catch (e) { alert('Failed to delete document'); }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB'][i]}`;
  };

  const formatDate = (str) => {
    const d = new Date(str), now = new Date();
    const days = Math.ceil(Math.abs(now - d) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7)  return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const StatusBadge = ({ status }) => {
    const cfg = {
      signed:   { cls: 'bg-emerald-100 text-emerald-800', icon: '✅' },
      pending:  { cls: 'bg-yellow-100  text-yellow-800',  icon: '⏳' },
      rejected: { cls: 'bg-red-100     text-red-800',     icon: '❌' },
    }[status] || { cls: 'bg-gray-100 text-gray-800', icon: '•' };

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
        {cfg.icon} <span className="capitalize">{status}</span>
      </span>
    );
  };

  /* ─── Mobile card view for each document ─── */
  const DocCard = ({ doc }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <DocumentCheckIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate text-sm">{doc.title}</p>
            <p className="text-xs text-gray-400 truncate">{doc.file_name}</p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {doc.description && (
        <p className="text-xs text-gray-400 line-clamp-2">{doc.description}</p>
      )}

      {doc.signed_file_url && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
          ✅ Signed copy available
        </span>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(doc.created_at)}</span>
        <span>{formatFileSize(doc.file_size)}</span>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1 pt-1 border-t border-gray-100 flex-wrap">
        <ActionBtn onClick={() => setPreviewDocument(doc)} color="blue" title="Preview">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </ActionBtn>

        <ActionBtn onClick={() => setAuditDocument(doc)} color="purple" title="Audit trail">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </ActionBtn>

        <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noopener noreferrer"
          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Download original">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>

        {doc.signed_file_url && (
          <a href={doc.signed_file_url} download={`signed-${doc.file_name}`}
            target="_blank" rel="noopener noreferrer"
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Download signed PDF">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </a>
        )}

        <ActionBtn onClick={() => navigate(`/sign/${doc.id}`)} color="purple" title="Sign document">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </ActionBtn>

        <ActionBtn onClick={() => handleDelete(doc.id)} color="red" title="Delete">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </ActionBtn>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Nav ── */}
      <nav className="bg-white shadow sticky top-0 z-10">
        <div className="container mx-auto px-4 flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SecureSign Logo" className="h-7 sm:h-8 w-auto" />
            <span className="font-bold text-lg sm:text-xl text-gray-800">SecureSign</span>
          </div>

          {/* Desktop user + logout */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Welcome,</p>
              <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
            </div>
            <button onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm transition">
              Logout
            </button>
          </div>

          {/* Mobile: greeting + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 truncate max-w-[100px]">{user?.name}</span>
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
              aria-label="Menu"
            >
              {mobileMenuOpen
                ? <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              }
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-2">
            <button onClick={handleLogout}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm transition">
              Logout
            </button>
          </div>
        )}
      </nav>

      <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Documents</h1>
          <button onClick={() => setShowUploadModal(true)}
            className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total',    value: stats.total,                    icon: DocumentTextIcon, color: 'text-gray-800' },
            { label: 'Pending',  value: stats.pending,                  icon: ClockIcon,        color: 'text-yellow-600' },
            { label: 'Signed',   value: stats.signed,                   icon: CheckCircleIcon,  color: 'text-green-600' },
            { label: 'Rejected', value: stats.rejected,                 icon: XCircleIcon,      color: 'text-red-600' },
            { label: 'Storage',  value: formatFileSize(stats.totalSize), icon: CircleStackIcon,  color: 'text-gray-800' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label}
              className="bg-white rounded-lg shadow p-3 sm:p-4 flex items-center justify-between hover:shadow-md transition col-span-1 last:col-span-2 xs:last:col-span-1">
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
              </div>
              <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${color} opacity-80`} />
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-5 sm:mb-6 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <input type="text" placeholder="Search documents…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Status + Sort selects — side-by-side on mobile too */}
          <div className="flex gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="signed">Signed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
        </div>

        {/* ── Document List ── */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
            <p className="mt-4 text-gray-500 text-sm">Loading documents…</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 sm:p-16 text-center">
            <div className="text-6xl sm:text-7xl mb-4">📭</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">No documents found</h3>
            <p className="text-gray-500 text-sm mb-6">
              {searchQuery ? 'No documents match your search' : 'Upload your first document to get started'}
            </p>
            {!searchQuery && (
              <button onClick={() => setShowUploadModal(true)} className="btn-primary">Upload Document</button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile card view (< md) */}
            <div className="md:hidden space-y-3">
              {filteredDocs.map(doc => <DocCard key={doc.id} doc={doc} />)}
              <p className="text-xs text-gray-400 text-center pt-2">
                Showing {filteredDocs.length} of {documents.length} documents
              </p>
            </div>

            {/* Desktop table view (>= md) */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Document', 'Uploaded', 'Status', 'Size', 'Actions'].map((h, i) => (
                        <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition-colors">

                        {/* Document */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <DocumentCheckIcon className="w-6 h-auto text-blue-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">{doc.title}</p>
                              <p className="text-xs text-gray-400 truncate">{doc.file_name}</p>
                              {doc.description && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{doc.description}</p>
                              )}
                              {doc.signed_file_url && (
                                <span className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-600 font-medium">
                                  ✅ Signed copy available
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Uploaded */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{formatDate(doc.created_at)}</p>
                          <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleTimeString()}</p>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <StatusBadge status={doc.status} />
                          {doc.finalized_at && (
                            <p className="text-xs text-gray-400 mt-1">Finalized {formatDate(doc.finalized_at)}</p>
                          )}
                        </td>

                        {/* Size */}
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatFileSize(doc.file_size)}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex justify-end items-center gap-1">
                            <ActionBtn onClick={() => setPreviewDocument(doc)} color="blue" title="Preview">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </ActionBtn>

                            <ActionBtn onClick={() => setAuditDocument(doc)} color="purple" title="Audit trail">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </ActionBtn>

                            <a href={doc.file_url} download={doc.file_name} target="_blank" rel="noopener noreferrer"
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Download original">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>

                            {doc.signed_file_url && (
                              <a href={doc.signed_file_url} download={`signed-${doc.file_name}`}
                                target="_blank" rel="noopener noreferrer"
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Download signed PDF">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </a>
                            )}

                            <ActionBtn onClick={() => navigate(`/sign/${doc.id}`)} color="purple" title="Sign document">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </ActionBtn>

                            <ActionBtn onClick={() => handleDelete(doc.id)} color="red" title="Delete">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </ActionBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">Showing {filteredDocs.length} of {documents.length} documents</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {previewDocument && (
        <DocumentPreview
          fileUrl={previewDocument.file_url}
          fileName={previewDocument.title || previewDocument.file_name}
          onClose={() => setPreviewDocument(null)}
        />
      )}

      {auditDocument && (
        <AuditModal
          document={auditDocument}
          onClose={() => setAuditDocument(null)}
        />
      )}
    </div>
  );
};

const ActionBtn = ({ onClick, color, title, children }) => {
  const colors = {
    blue:   'text-blue-600   hover:bg-blue-50',
    green:  'text-green-600  hover:bg-green-50',
    purple: 'text-purple-600 hover:bg-purple-50',
    red:    'text-red-600    hover:bg-red-50',
  };
  return (
    <button onClick={onClick} title={title}
      className={`p-2 rounded-lg transition ${colors[color] || colors.blue}`}>
      {children}
    </button>
  );
};

export default Dashboard;