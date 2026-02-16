import React, { useState } from 'react';

const IframePDFPreview = ({ fileUrl, fileName, onClose }) => {
  const [loading, setLoading] = useState(true);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col">
        {/* Header - More compact */}
        <div className="flex justify-between items-center px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📄</span>
              <h3 className="text-lg font-semibold text-gray-800 truncate max-w-md" title={fileName}>
                {fileName}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Download button */}
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Download"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            
            {/* Open in new tab button */}
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            
            {/* Fullscreen button (optional) */}
            <button
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  document.documentElement.requestFullscreen();
                }
              }}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Toggle fullscreen"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5M4 16v4m0-4h4m-4 0l5 5m11-5v4m-4-4h4m-4 0l5 5" />
              </svg>
            </button>
            
            {/* Separator */}
            <div className="w-px h-6 bg-gray-300 mx-2"></div>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
              title="Close"
            >
              <svg className="w-5 h-5 text-gray-700 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Viewer - Takes remaining height */}
        <div className="flex-1 bg-gray-800 p-4 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-white text-lg">Loading PDF...</p>
              </div>
            </div>
          )}
          
          {/* Iframe takes full height */}
          <iframe
            src={fileUrl}
            className={`w-full h-full rounded-lg ${loading ? 'opacity-0' : 'opacity-100'}`}
            title={fileName}
            onLoad={() => setLoading(false)}
          />
        </div>

        {/* Footer - Minimal */}
        <div className="px-6 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-sm">
          <p className="text-gray-600">
            <span className="font-medium">Tip:</span> Use the download button to save locally
          </p>
          <p className="text-gray-500">
            {loading ? 'Loading...' : 'PDF loaded successfully'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IframePDFPreview;