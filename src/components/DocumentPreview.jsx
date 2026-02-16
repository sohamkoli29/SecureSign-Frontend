import React, { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import '../utils/pdfWorker'; // Import worker configuration

const DocumentPreview = ({ fileUrl, fileName, onClose }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Reset state when file changes
    setLoading(true);
    setError(null);
    setPageNumber(1);
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    console.log('PDF loaded successfully, pages:', numPages);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    
    if (retryCount < 3) {
      // Retry loading
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setLoading(true);
      }, 1000 * (retryCount + 1)); // Exponential backoff
      
      setError(`Loading PDF... Attempt ${retryCount + 1}/3`);
    } else {
      setError('Failed to load PDF. Please try downloading the file instead.');
      setLoading(false);
    }
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => {
    if (pageNumber > 1) {
      changePage(-1);
    }
  };

  const nextPage = () => {
    if (pageNumber < numPages) {
      changePage(1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.6));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-800">{fileName}</h3>
            {numPages && (
              <span className="text-sm text-gray-500">
                Page {pageNumber} of {numPages}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Zoom controls */}
            <button
              onClick={zoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              disabled={scale <= 0.6}
              title="Zoom Out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 w-16 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              disabled={scale >= 2.0}
              title="Zoom In"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            {/* Download button */}
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">
                  {error || 'Loading PDF...'}
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">❌</div>
                <p className="text-red-600 font-semibold mb-4">{error}</p>
                <div className="flex space-x-3 justify-center">
                  <a
                    href={fileUrl}
                    download={fileName}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Download PDF
                  </a>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center min-h-full">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              options={{
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
              }}
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-2xl"
                loading={
                  <div className="w-[600px] h-[800px] bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">Loading page...</span>
                  </div>
                }
              />
            </Document>
          </div>
        </div>

        {/* Footer with navigation */}
        {numPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-200">
            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                pageNumber <= 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= numPages) {
                    setPageNumber(value);
                  }
                }}
                className="w-16 text-center border border-gray-300 rounded-lg py-1"
              />
              <span className="text-gray-600">of {numPages}</span>
            </div>
            
            <button
              onClick={nextPage}
              disabled={pageNumber >= numPages}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                pageNumber >= numPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <span>Next</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;