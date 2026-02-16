import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Document, Page } from 'react-pdf';
import SignaturePad from './SignaturePad';

// Import styles for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Import worker configuration
import '../utils/pdfWorker';

const SignaturePlacement = ({ document, onComplete }) => {
  const [signatures, setSignatures] = useState([]);
  const [selectedSignature, setSelectedSignature] = useState(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    fetchSignatures();
  }, [document.id]);

  const fetchSignatures = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/signatures/document/${document.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Fetched signatures:', response.data.data);
      setSignatures(response.data.data || []);
    } catch (error) {
      console.error('Error fetching signatures:', error);
      alert('Failed to load signatures');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    console.log('PDF loaded:', numPages, 'pages');
  };

  const handleSignatureClick = (signature) => {
    setSelectedSignature(signature);
    setShowSignaturePad(true);
  };

  const handleSignatureSave = async (signatureData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (selectedSignature) {
        // Update existing signature
        const response = await axios.patch(
          `/api/signatures/${selectedSignature.id}/status`,
          {
            status: 'signed',
            signature_data: signatureData
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        console.log('✅ Signature updated:', response.data);
      } else {
        // Create new signature with signature data
        const coordinates = { x: 100, y: 100 };
        
        const response = await axios.post('/api/signatures', {
          document_id: document.id,
          signer_name: 'New Signer',
          signer_email: '',
          coordinates: coordinates,
          page_number: currentPage,
          signature_data: signatureData
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Signature created:', response.data);
      }

      setShowSignaturePad(false);
      setSelectedSignature(null);
      await fetchSignatures();
    } catch (error) {
      console.error('❌ Error saving signature:', error);
      const errorMsg = error.response?.data?.error || 'Failed to save signature';
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, signature) => {
    e.preventDefault();
    const sigElement = e.currentTarget;
    const rect = sigElement.getBoundingClientRect();
    
    setDragging(signature);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleDragMove = (e) => {
    if (!dragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(
      e.clientX - containerRect.left - dragOffset.x,
      containerRect.width - 150
    ));
    const y = Math.max(0, Math.min(
      e.clientY - containerRect.top - dragOffset.y,
      containerRect.height - 60
    ));

    setSignatures(prev => 
      prev.map(sig => 
        sig.id === dragging.id 
          ? { ...sig, coordinates: { x, y } }
          : sig
      )
    );
  };

  const handleDragEnd = async () => {
    if (dragging) {
      try {
        const token = localStorage.getItem('token');
        const updatedSig = signatures.find(s => s.id === dragging.id);
        
        await axios.put(`/api/signatures/${dragging.id}/position`, {
          coordinates: updatedSig.coordinates,
          page_number: currentPage
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Position updated');
      } catch (error) {
        console.error('Error updating position:', error);
        await fetchSignatures();
      }
      setDragging(null);
    }
  };

  const handleDeleteSignature = async (sigId) => {
    if (!window.confirm('Delete this signature?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/signatures/${sigId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchSignatures();
    } catch (error) {
      console.error('Error deleting signature:', error);
      alert('Failed to delete signature');
    }
  };

  const createNewSignature = () => {
    setSelectedSignature(null);
    setShowSignaturePad(true);
  };

  const changePage = (offset) => {
    setCurrentPage(prev => Math.max(1, Math.min(prev + offset, numPages || 1)));
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Signatures</h2>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
        
        <button
          onClick={createNewSignature}
          disabled={loading}
          className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Signature</span>
        </button>

        <div className="space-y-3">
          {signatures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No signatures yet</p>
              <p className="text-sm mt-2">Click "Add Signature"</p>
            </div>
          ) : (
            signatures.map((sig) => (
              <div
                key={sig.id}
                className={`p-3 border rounded-lg ${
                  dragging?.id === sig.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{sig.signer_name}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    sig.status === 'signed' ? 'bg-green-100 text-green-800' :
                    sig.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sig.status}
                  </span>
                </div>
                
                {sig.signature_data && (
                  <div className="mb-2 border rounded p-2 bg-gray-50">
                    <img 
                      src={sig.signature_data} 
                      alt="Signature preview"
                      className="w-full h-auto"
                      style={{ maxHeight: '50px', objectFit: 'contain' }}
                    />
                  </div>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                  <span>Page {sig.page_number}</span>
                  <span>x: {Math.round(sig.coordinates?.x || 0)}, y: {Math.round(sig.coordinates?.y || 0)}</span>
                </div>
                
                <div className="flex space-x-2">
                  {sig.status !== 'signed' && (
                    <button
                      onClick={() => handleSignatureClick(sig)}
                      className="flex-1 px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Sign
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSignature(sig.id)}
                    className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{document.title}</h3>
          <div className="flex items-center space-x-4">
            {numPages && (
              <>
                <button
                  onClick={() => changePage(-1)}
                  disabled={currentPage <= 1}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  ◀
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} / {numPages}
                </span>
                <button
                  onClick={() => changePage(1)}
                  disabled={currentPage >= numPages}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  ▶
                </button>
              </>
            )}
            <div className="w-px h-6 bg-gray-300"></div>
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              −
            </button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.min(2, s + 0.1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              +
            </button>
          </div>
        </div>

        {/* PDF with Signature Overlays */}
        <div
          ref={containerRef}
          className="relative bg-gray-800 rounded-lg shadow-lg overflow-auto mx-auto p-8"
          style={{ maxWidth: '1000px' }}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <Document
            file={document.file_url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            }
          >
            <div className="relative inline-block">
              <Page 
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onLoadSuccess={(page) => {
                  setContainerSize({
                    width: page.width * scale,
                    height: page.height * scale
                  });
                }}
              />
              
              {/* Signature Overlays - NOW ON TOP OF CANVAS */}
              {signatures
                .filter(sig => sig.page_number === currentPage)
                .map((sig) => (
                  <div
                    key={sig.id}
                    className={`absolute cursor-move ${
                      dragging?.id === sig.id ? 'ring-4 ring-blue-500 z-50' : 'z-10'
                    }`}
                    style={{
                      left: `${sig.coordinates?.x || 0}px`,
                      top: `${sig.coordinates?.y || 0}px`,
                      pointerEvents: dragging?.id === sig.id ? 'none' : 'auto'
                    }}
                    onMouseDown={(e) => handleDragStart(e, sig)}
                  >
                    {sig.signature_data ? (
                      <div className="bg-transparent rounded shadow-lg p-1">
                        <img 
                          src={sig.signature_data} 
                          alt={`Signature by ${sig.signer_name}`}
                          className="w-auto h-auto"
                          style={{ 
                            maxWidth: '200px', 
                            maxHeight: '100px',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
                        <span>✍️</span>
                        <span className="text-sm font-medium">{sig.signer_name}</span>
                        {sig.status === 'signed' && (
                          <span className="text-xs bg-green-600 px-1 rounded">✓</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </Document>
        </div>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePad
          onSave={handleSignatureSave}
          onClose={() => {
            setShowSignaturePad(false);
            setSelectedSignature(null);
          }}
        />
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignaturePlacement;