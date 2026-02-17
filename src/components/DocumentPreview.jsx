import React, { useState } from 'react';
import PDFViewer from './PDFViewer';

/**
 * DocumentPreview
 * Modal that shows a document preview using the shared canvas-based PDFViewer.
 * No signatures are passed here — pure read-only view.
 */
const DocumentPreview = ({ fileUrl, fileName, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
        style={{ height: '90vh' }}
      >
        <PDFViewer
          fileUrl={fileUrl}
          fileName={fileName}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showToolbar={true}
          onClose={onClose}
          height="100%"
        />
      </div>
    </div>
  );
};

export default DocumentPreview;