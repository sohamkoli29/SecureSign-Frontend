import React, { useState } from 'react';
import PDFViewer from './PDFViewer';

/**
 * DocumentPreview
 * Modal overlay for read-only PDF preview from the Dashboard.
 * Uses the shared PDFViewer canvas component — no iframe, no white-box issue.
 */
const DocumentPreview = ({ fileUrl, fileName, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }} /* click-outside closes */
    >
      <div
        className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ height: '90vh' }}
      >
        <PDFViewer
          fileUrl={fileUrl}
          fileName={fileName}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showToolbar
          onClose={onClose}
          height="100%"
          /* No signatures, no drag handlers — pure preview */
        />
      </div>
    </div>
  );
};

export default DocumentPreview;