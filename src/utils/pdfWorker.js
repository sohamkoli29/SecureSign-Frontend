import { pdfjs } from 'react-pdf';

// Configure the worker - OFFICIAL RECOMMENDED WAY
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

console.log('✅ PDF.js worker configured');