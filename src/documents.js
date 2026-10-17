const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PAGES = 30;

/** Read a browser File locally. PDF dependencies are fetched only for a PDF upload. */
export async function extractDocument(file) {
  if (!file || typeof file.name !== 'string' || !Number.isFinite(file.size)) throw new Error('Choose a text (.txt) or PDF resume first.');
  if (file.size > MAX_BYTES) throw new Error('This file is too large. Choose a resume smaller than 8 MB.');
  if (!file.size) throw new Error('This file is empty. Choose a resume containing selectable text.');
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
   const isText = /\.(txt|md)$/i.test(file.name) || file.type === 'text/plain';
  if (!isPdf && !isText) throw new Error('Unsupported file type. Upload a .txt or .pdf resume.');
  if (isText && !isPdf) {
    const text = (await file.text()).replace(/^\uFEFF/, '').trim();
    if (!text) throw new Error('This text file has no readable content. Choose a resume with text.');
    return text;
  }

  let document;
  let loadingTask;
  try {
    const [pdfjs, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const data = new Uint8Array(await file.arrayBuffer());
    loadingTask = pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true });
    document = await loadingTask.promise;
    if (document.numPages > MAX_PAGES) throw new Error('This PDF has more than 30 pages. Upload a shorter resume.');
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let previousY;
      let text = '';
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        const y = item.transform?.[5];
        if (previousY !== undefined && y !== undefined && Math.abs(y - previousY) > 3 && !text.endsWith('\n')) text += '\n';
        text += item.str + (item.hasEOL ? '\n' : ' ');
        previousY = y;
      }
      pages.push(text.trim());
      page.cleanup();
    }
    const text = pages.join('\n\n').trim();
    if (text.replace(/\s/g, '').length < 10) throw new Error('This PDF appears to be scanned or has no selectable text. Export a text-based PDF or upload a .txt resume.');
    return text;
  } catch (error) {
    if (error?.name === 'PasswordException') throw new Error('This PDF is password-protected. Remove its password and upload it again.');
    if (['InvalidPDFException', 'MissingPDFException', 'UnexpectedResponseException', 'FormatError'].includes(error?.name)) throw new Error('This PDF could not be read. It may be damaged or invalid; export it again or upload a .txt resume.');
    if (/30 pages|scanned|selectable text/.test(error?.message || '')) throw error;
    throw new Error('Unable to read this PDF. Try exporting it as a new text-based PDF or upload a .txt resume.');
  } finally {
    if (loadingTask) await loadingTask.destroy().catch(() => {});
  }
}
