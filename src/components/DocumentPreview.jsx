import React, { useState } from 'react';
import PDFViewer from './PDFViewer';

const DocumentPreview = ({ fileUrl, fileName, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 p-0 sm:p-2 md:p-4 md:flex md:items-center md:justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Mobile: full screen | Desktop: centered modal */}
      <div className="h-full md:h-[90vh] md:max-w-5xl md:w-full rounded-none sm:rounded-lg md:rounded-2xl overflow-hidden shadow-2xl flex flex-col relative">
        
        {/* Mobile close button - overlay style */}
        <button
          onClick={onClose}
          className="md:hidden absolute top-3 right-3 z-50 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition shadow-lg"
          aria-label="Close preview"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <PDFViewer
          fileUrl={fileUrl}
          fileName={fileName}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showToolbar
          onClose={onClose}
          height="100%"
        />
      </div>
    </div>
  );
};

export default DocumentPreview;