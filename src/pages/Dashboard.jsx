import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import UploadModal from '../components/UploadModal';
import DocumentPreview from '../components/DocumentPreview';
// ❌ REMOVED: IframePDFPreview is no longer needed

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    signed: 0,
    rejected: 0,
    totalSize: 0
  });
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, []);

  useEffect(() => {
    filterAndSortDocuments();
  }, [documents, filter, searchQuery, sortBy]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/documents/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filterAndSortDocuments = () => {
    let filtered = [...documents];

    if (filter !== 'all') {
      filtered = filtered.filter(doc => doc.status === filter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title?.toLowerCase().includes(query) ||
        doc.file_name?.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
        case 'name':   return (a.title || '').localeCompare(b.title || '');
        case 'size':   return (b.file_size || 0) - (a.file_size || 0);
        default:       return 0;
      }
    });

    setFilteredDocs(filtered);
  };

  const handleUploadSuccess = (newDocument) => {
    setDocuments(prev => [newDocument, ...prev]);
    fetchStats();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(prev => prev.filter(d => d.id !== docId));
      fetchStats();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)  return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const cfg = {
      signed:   { bg: 'bg-green-100',  text: 'text-green-800',  icon: '✅' },
      pending:  { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      rejected: { bg: 'bg-red-100',    text: 'text-red-800',    icon: '❌' },
    };
    const { bg, text, icon } = cfg[status] || cfg.pending;
    return (
      <span className={`${bg} ${text} px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1`}>
        <span>{icon}</span>
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="bg-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📄</span>
              <span className="font-bold text-gray-800 text-xl">DocSign</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome,</p>
                <p className="font-semibold text-gray-800">{user?.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">My Documents</h1>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Upload New Document</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total',    value: stats.total,               color: 'text-gray-800',   icon: '📄', iconColor: 'text-blue-500'   },
            { label: 'Pending',  value: stats.pending,             color: 'text-yellow-600', icon: '⏳', iconColor: 'text-yellow-500' },
            { label: 'Signed',   value: stats.signed,              color: 'text-green-600',  icon: '✅', iconColor: 'text-green-500'  },
            { label: 'Rejected', value: stats.rejected,            color: 'text-red-600',    icon: '❌', iconColor: 'text-red-500'    },
            { label: 'Storage',  value: formatFileSize(stats.totalSize), color: 'text-gray-800', icon: '💾', iconColor: 'text-purple-500' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
                <div className="text-2xl">{icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="md:w-48">
              <select value={filter} onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="signed">Signed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="md:w-48">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
            <p className="mt-4 text-gray-600">Loading documents...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-8xl mb-6">📭</div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">No documents found</h3>
            <p className="text-gray-600 mb-8">
              {searchQuery ? 'No documents match your search criteria' : 'Upload your first document to get started'}
            </p>
            {!searchQuery && (
              <button onClick={() => setShowUploadModal(true)} className="btn-primary">
                Upload Document
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Document', 'Uploaded', 'Status', 'Size', 'Actions'].map((h, i) => (
                      <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-3xl mr-3">📄</span>
                          <div>
                            <p className="font-medium text-gray-800">{doc.title}</p>
                            <p className="text-sm text-gray-500">{doc.file_name}</p>
                            {doc.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-1">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <p>{formatDate(doc.created_at)}</p>
                        <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatFileSize(doc.file_size)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end space-x-2">

                          {/* Preview */}
                          <button
                            onClick={() => setPreviewDocument(doc)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Preview"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Download */}
                          <a
                            href={doc.file_url}
                            download={doc.file_name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>

                          {/* Sign */}
                          <button
                            onClick={() => navigate(`/sign/${doc.id}`)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Sign"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {filteredDocs.length} of {documents.length} documents
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Upload Modal ─────────────────────────────────────────── */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* ── Preview Modal — ONE modal, no duplicates ──────────────── */}
      {previewDocument && (
        <DocumentPreview
          fileUrl={previewDocument.file_url}
          fileName={previewDocument.title || previewDocument.file_name}
          onClose={() => setPreviewDocument(null)}
        />
      )}

    </div>
  );
};

export default Dashboard;