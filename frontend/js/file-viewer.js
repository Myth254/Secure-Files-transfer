/**
 * file-viewer.js
 * Client-side preview rendering for decrypted file bytes.
 *
 * Plaintext never leaves the browser. The backend only returns encrypted blobs.
 */

let viewerObjectUrls = [];

function registerViewerUrl(url) {
  viewerObjectUrls.push(url);
  return url;
}

function revokeViewerUrls() {
  viewerObjectUrls.forEach(url => URL.revokeObjectURL(url));
  viewerObjectUrls = [];
}

function uint8ToArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function bytesToBlobUrl(bytes, mimeType = 'application/octet-stream') {
  return registerViewerUrl(URL.createObjectURL(new Blob([bytes], { type: mimeType })));
}

function showViewerAlert(message, type = 'info') {
  const alertEl = document.getElementById('fileViewerAlert');
  if (!alertEl) return;
  alertEl.className = `viewer-alert alert alert-${type}`;
  alertEl.textContent = message;
  alertEl.classList.remove('hidden');
}

function hideViewerAlert() {
  document.getElementById('fileViewerAlert')?.classList.add('hidden');
}

function extractOdtText(node) {
  if (!node) return '';
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  return Array.from(node.childNodes).map(extractOdtText).join('');
}

function renderOdtNode(node) {
  const parts = [];

  Array.from(node.childNodes).forEach(child => {
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const name = child.localName;
    if (name === 'h') {
      const level = Math.min(6, Math.max(1, Number(child.getAttribute('text:outline-level') || 2)));
      parts.push(`<h${level}>${escHtml(extractOdtText(child).trim())}</h${level}>`);
      return;
    }
    if (name === 'p') {
      const text = extractOdtText(child).trim();
      if (text) parts.push(`<p>${escHtml(text)}</p>`);
      return;
    }
    if (name === 'list') {
      const items = Array.from(child.childNodes)
        .filter(item => item.nodeType === Node.ELEMENT_NODE && item.localName === 'list-item')
        .map(item => `<li>${escHtml(extractOdtText(item).trim())}</li>`)
        .join('');
      if (items) parts.push(`<ul>${items}</ul>`);
      return;
    }
    if (name === 'table') {
      const rows = Array.from(child.childNodes)
        .filter(row => row.nodeType === Node.ELEMENT_NODE && row.localName === 'table-row')
        .map(row => {
          const cells = Array.from(row.childNodes)
            .filter(cell => cell.nodeType === Node.ELEMENT_NODE && cell.localName === 'table-cell')
            .map(cell => `<td>${escHtml(extractOdtText(cell).trim())}</td>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      if (rows) parts.push(`<div class="viewer-table-wrap"><table class="viewer-table">${rows}</table></div>`);
      return;
    }

    parts.push(renderOdtNode(child));
  });

  return parts.join('');
}

async function renderTextPreview(container, bytes) {
  const pre = document.createElement('pre');
  pre.className = 'viewer-text';
  pre.textContent = new TextDecoder().decode(bytes);
  container.replaceChildren(pre);
}

async function renderImagePreview(container, bytes, mimeType) {
  const img = document.createElement('img');
  img.className = 'viewer-image';
  img.alt = 'Decrypted image preview';
  img.src = bytesToBlobUrl(bytes, mimeType);
  container.replaceChildren(img);
}

async function renderPdfPreview(container, bytes, mimeType) {
  const frame = document.createElement('iframe');
  frame.className = 'viewer-frame';
  frame.src = bytesToBlobUrl(bytes, mimeType || 'application/pdf');
  frame.title = 'PDF preview';
  container.replaceChildren(frame);
}

async function renderDocxPreview(container, bytes) {
  if (!window.mammoth) {
    throw new Error('DOCX preview library is unavailable');
  }

  const result = await window.mammoth.convertToHtml({
    arrayBuffer: uint8ToArrayBuffer(bytes),
  });

  const surface = document.createElement('div');
  surface.className = 'viewer-richtext';
  surface.innerHTML = result.value || '<p>No previewable content found.</p>';
  container.replaceChildren(surface);

  if (result.messages?.length) {
    showViewerAlert('Preview generated with limited formatting fidelity.', 'warning');
  }
}

async function renderSpreadsheetPreview(container, bytes) {
  if (!window.XLSX) {
    throw new Error('Spreadsheet preview library is unavailable');
  }

  const workbook = window.XLSX.read(uint8ToArrayBuffer(bytes), { type: 'array' });
  const wrapper = document.createElement('div');
  wrapper.className = 'viewer-sheets';

  workbook.SheetNames.forEach(sheetName => {
    const section = document.createElement('section');
    section.className = 'viewer-sheet';

    const title = document.createElement('div');
    title.className = 'viewer-sheet-title';
    title.textContent = sheetName;

    const tableWrap = document.createElement('div');
    tableWrap.className = 'viewer-table-wrap';
    tableWrap.innerHTML = window.XLSX.utils.sheet_to_html(workbook.Sheets[sheetName], {
      editable: false,
      header: '',
      footer: '',
    });

    section.append(title, tableWrap);
    wrapper.appendChild(section);
  });

  container.replaceChildren(wrapper);
}

async function renderOdtPreview(container, bytes) {
  if (!window.fflate?.unzipSync) {
    throw new Error('ODT preview library is unavailable');
  }

  const archive = window.fflate.unzipSync(bytes);
  const content = archive['content.xml'];
  if (!content) {
    throw new Error('ODT content.xml was not found');
  }

  const xml = new TextDecoder().decode(content);
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const officeText = Array.from(doc.getElementsByTagName('*')).find(node => node.localName === 'text');
  if (!officeText) {
    throw new Error('ODT text content could not be parsed');
  }

  const html = renderOdtNode(officeText) || '<p>No previewable content found.</p>';
  const surface = document.createElement('div');
  surface.className = 'viewer-richtext';
  surface.innerHTML = html;
  container.replaceChildren(surface);
}

function renderUnsupportedPreview(container, filename) {
  container.innerHTML = `
    <div class="table-empty">
      <div class="table-empty-icon">📄</div>
      <div class="table-empty-text">Preview is not available for ${escHtml(filename)}</div>
      <div class="table-empty-sub text-muted">
        Use the download action to save and open this file locally.
      </div>
    </div>
  `;
}

async function renderFilePreview(payload) {
  const container = document.getElementById('fileViewerBody');
  if (!container) return;

  hideViewerAlert();

  const extension = (payload.extension || payload.filename.split('.').pop() || '').toLowerCase();
  if (extension === 'txt') return renderTextPreview(container, payload.bytes);
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
    return renderImagePreview(container, payload.bytes, payload.mimeType);
  }
  if (extension === 'pdf') return renderPdfPreview(container, payload.bytes, payload.mimeType);
  if (extension === 'docx') return renderDocxPreview(container, payload.bytes);
  if (extension === 'odt') return renderOdtPreview(container, payload.bytes);
  if (['xls', 'xlsx'].includes(extension)) return renderSpreadsheetPreview(container, payload.bytes);

  return renderUnsupportedPreview(container, payload.filename);
}

async function openFileViewerModal(payload) {
  revokeViewerUrls();
  hideViewerAlert();

  document.getElementById('fileViewerTitle').textContent = payload.filename;
  document.getElementById('fileViewerSubtitle').textContent =
    payload.source === 'shared'
      ? 'Shared file preview decrypted locally in your browser'
      : 'File preview decrypted locally in your browser';
  document.getElementById('fileViewerMeta').innerHTML = `
    <span class="badge badge-blue">${escHtml((payload.extension || '').toUpperCase() || 'FILE')}</span>
    <span>${formatBytes(payload.bytes.length)}</span>
    <span class="sep">·</span>
    <span>${payload.ownerUsername ? `Owner: ${escHtml(payload.ownerUsername)}` : 'Your file'}</span>
    <span class="sep">·</span>
    <span>${payload.source === 'shared' ? 'Stored as a shared reference' : 'Stored in your vault'}</span>
  `;

  document.getElementById('fileViewerBody').innerHTML = `
    <div class="table-empty">
      <div class="table-empty-icon">👁</div>
      <div class="table-empty-text">Rendering preview…</div>
    </div>
  `;

  openModal('fileViewerModal');

  try {
    await renderFilePreview(payload);
  } catch (error) {
    console.error('Preview render failed:', error);
    showViewerAlert(error.message || 'Preview could not be rendered.', 'error');
    renderUnsupportedPreview(document.getElementById('fileViewerBody'), payload.filename);
  }
}

function closeFileViewerModal() {
  revokeViewerUrls();
  hideViewerAlert();
  document.getElementById('fileViewerMeta').innerHTML = '';
  document.getElementById('fileViewerBody').innerHTML = '';
  closeModal('fileViewerModal');
}

window.fileViewer = {
  openFileViewerModal,
  closeFileViewerModal,
};

window.openFileViewerModal = openFileViewerModal;
window.closeFileViewerModal = closeFileViewerModal;
