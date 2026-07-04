'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, X, RotateCw, Trash2, Plus,
  GripVertical, AlertTriangle, CheckCircle2, Loader2,
  FileImage, FileText, ZoomIn, ChevronUp, ChevronDown
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PageStatus = 'ready' | 'processing' | 'done' | 'error' | 'skipped';

export interface PageItem {
  id: string;
  file: File;
  thumbnailUrl: string;
  pageNum: number;
  originalName: string;
  rotation: number;
  status: PageStatus;
  error?: string;
  ocrText?: string;
}

interface UploadManagerProps {
  label: string;
  accent: string;
  accentLight: string;
  maxPages?: number;
  maxFileSizeMB?: number;
  pages: PageItem[];
  onPagesChange: (pages: PageItem[]) => void;
  disabled?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const REJECTED_EXTS = ['.doc', '.docx', '.zip', '.txt', '.xls', '.xlsx'];

// ─── PDF → page images ─────────────────────────────────────────────────────────

async function pdfToPageFiles(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pageFiles: File[] = [];

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(i, numPages);
    const page = await pdf.getPage(i);
    const scale = 1.8;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), 'image/jpeg', 0.82)
    );
    pageFiles.push(
      new File(
        [blob],
        `${file.name.replace(/\.pdf$/i, '')}_page${i}.jpg`,
        { type: 'image/jpeg' }
      )
    );
  }
  return pageFiles;
}

// ─── Image compression ─────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > 1400) { h = Math.round(h * (1400 / w)); w = 1400; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (b) => resolve(new File([b!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
          'image/jpeg', 0.82
        );
      };
      img.onerror = () => resolve(file);
      img.src = ev.target!.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _uid = 0;
const uid = () => `pg_${Date.now()}_${++_uid}`;
const makeThumbnail = (file: File) => URL.createObjectURL(file);
const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function UploadManager({
  accent,
  accentLight,
  maxPages = 20,
  maxFileSizeMB = 25,
  pages,
  onPagesChange,
  disabled = false,
}: UploadManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTargetId = useRef<string | null>(null);
  const dragSrcId = useRef<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [validationError, setValidationError] = useState('');
  const [zoomedPage, setZoomedPage] = useState<PageItem | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    const urls = pages.map((p) => p.thumbnailUrl);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── File ingestion ────────────────────────────────────────────────────────────

  const ingestFiles = useCallback(async (rawFiles: FileList | File[]) => {
    setValidationError('');
    const arr = Array.from(rawFiles);

    const bad = arr.filter(
      (f) =>
        REJECTED_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext)) ||
        (!ACCEPTED_TYPES.includes(f.type) && !f.name.toLowerCase().endsWith('.pdf'))
    );
    if (bad.length) {
      setValidationError(`Unsupported type: ${bad.map((f) => f.name).join(', ')}. Accepted: PDF, JPG, PNG.`);
      return;
    }

    const tooBig = arr.filter((f) => {
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      return f.size > (isPdf ? maxFileSizeMB : 10) * 1024 * 1024;
    });
    if (tooBig.length) {
      setValidationError(`File too large: ${tooBig.map((f) => f.name).join(', ')}`);
      return;
    }

    const newItems: PageItem[] = [];

    for (const file of arr) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        setIsPdfLoading(true);
        try {
          const pfs = await pdfToPageFiles(file, (c, t) => setPdfProgress({ current: c, total: t }));
          for (const pf of pfs) {
            newItems.push({ id: uid(), file: pf, thumbnailUrl: makeThumbnail(pf), pageNum: 0, originalName: file.name, rotation: 0, status: 'ready' });
          }
        } catch {
          setValidationError(`Failed to read PDF: ${file.name}`);
        } finally {
          setIsPdfLoading(false);
          setPdfProgress(null);
        }
      } else {
        const cf = await compressImage(file);
        newItems.push({ id: uid(), file: cf, thumbnailUrl: makeThumbnail(cf), pageNum: 0, originalName: file.name, rotation: 0, status: 'ready' });
      }
    }

    const combined = [...pages, ...newItems];
    if (combined.length > maxPages) setValidationError(`Max ${maxPages} pages. Extra pages removed.`);
    onPagesChange(combined.slice(0, maxPages).map((p, i) => ({ ...p, pageNum: i + 1 })));
  }, [pages, maxPages, maxFileSizeMB, onPagesChange]);

  // ── Drop zone ─────────────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (!disabled) ingestFiles(e.dataTransfer.files);
  };

  // ── Page reorder ─────────────────────────────────────────────────────────────

  const handlePageDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); setDragOverId(null);
    if (!dragSrcId.current || dragSrcId.current === targetId) return;
    const from = pages.findIndex((p) => p.id === dragSrcId.current);
    const to = pages.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const r = [...pages];
    const [m] = r.splice(from, 1);
    r.splice(to, 0, m);
    onPagesChange(r.map((p, i) => ({ ...p, pageNum: i + 1 })));
    dragSrcId.current = null;
  };

  const movePage = (idx: number, dir: -1 | 1) => {
    const t = idx + dir;
    if (t < 0 || t >= pages.length) return;
    const r = [...pages];
    [r[idx], r[t]] = [r[t], r[idx]];
    onPagesChange(r.map((p, i) => ({ ...p, pageNum: i + 1 })));
  };

  // ── Rotate ────────────────────────────────────────────────────────────────────

  const rotatePage = async (id: string) => {
    const idx = pages.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const p = pages[idx];
    const newRot = (p.rotation + 90) % 360;
    const rotatedFile = await new Promise<File>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const swap = newRot === 90 || newRot === 270;
        const canvas = document.createElement('canvas');
        canvas.width = swap ? img.height : img.width;
        canvas.height = swap ? img.width : img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((newRot * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        canvas.toBlob((b) => resolve(new File([b!], p.file.name, { type: 'image/jpeg' })), 'image/jpeg', 0.85);
      };
      img.src = p.thumbnailUrl;
    });
    URL.revokeObjectURL(p.thumbnailUrl);
    const updated = [...pages];
    updated[idx] = { ...p, file: rotatedFile, thumbnailUrl: makeThumbnail(rotatedFile), rotation: newRot };
    onPagesChange(updated.map((pg, i) => ({ ...pg, pageNum: i + 1 })));
  };

  // ── Delete & Clear ────────────────────────────────────────────────────────────

  const deletePage = (id: string) => {
    const p = pages.find((pg) => pg.id === id);
    if (p) URL.revokeObjectURL(p.thumbnailUrl);
    onPagesChange(pages.filter((pg) => pg.id !== id).map((pg, i) => ({ ...pg, pageNum: i + 1 })));
  };

  const clearAll = () => {
    pages.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl));
    onPagesChange([]);
  };

  // ── Replace ───────────────────────────────────────────────────────────────────

  const triggerReplace = (id: string) => { replaceTargetId.current = id; replaceInput.current?.click(); };
  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replaceTargetId.current) return;
    const idx = pages.findIndex((p) => p.id === replaceTargetId.current);
    if (idx < 0) return;
    const cf = await compressImage(file);
    URL.revokeObjectURL(pages[idx].thumbnailUrl);
    const updated = [...pages];
    updated[idx] = { ...updated[idx], file: cf, thumbnailUrl: makeThumbnail(cf), rotation: 0, status: 'ready', error: undefined, ocrText: undefined, originalName: file.name };
    onPagesChange(updated);
    e.target.value = ''; replaceTargetId.current = null;
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const totalBytes = pages.reduce((s, p) => s + p.file.size, 0);
  const doneCount = pages.filter((p) => p.status === 'done').length;
  const errorCount = pages.filter((p) => p.status === 'error').length;
  const processingCount = pages.filter((p) => p.status === 'processing').length;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Drop zone (empty state) */}
      {pages.length === 0 ? (
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
            minHeight: 230, border: `2px dashed ${isDragging ? accent : '#cbd5e1'}`,
            borderRadius: 18, background: isDragging ? accentLight : '#fafbfc',
            cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s', padding: 32,
          }}
        >
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={26} style={{ color: accent }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>Drag & drop files here</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>or <span style={{ color: accent, fontWeight: 600 }}>browse files</span></div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>PDF · JPG · PNG &nbsp;·&nbsp; Max {maxPages} pages &nbsp;·&nbsp; PDF up to {maxFileSizeMB} MB · Images up to 10 MB</div>
          </div>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} disabled={disabled}
            onChange={(e) => { if (e.target.files) ingestFiles(e.target.files); e.target.value = ''; }} />
        </label>
      ) : (
        /* Toolbar strip */
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 99, background: accentLight, color: accent, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: `1px solid ${accent}30` }}>
            <Plus size={15} /> Add More
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} disabled={disabled}
              onChange={(e) => { if (e.target.files) ingestFiles(e.target.files); e.target.value = ''; }} />
          </label>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileImage size={13} /> {pages.length} page{pages.length !== 1 ? 's' : ''}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={13} /> {formatBytes(totalBytes)}</span>
            {doneCount > 0 && <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={13} /> {doneCount} OCR done</span>}
            {processingCount > 0 && <span style={{ color: accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><Loader2 size={13} className="upload-mgr-spin" /> processing…</span>}
            {errorCount > 0 && <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={13} /> {errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
          </div>

          <button onClick={clearAll} disabled={disabled} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'none', border: '1px solid #fecaca', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Trash2 size={13} /> Clear All
          </button>
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#b91c1c' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ flex: 1 }}>{validationError}</span>
          <button onClick={() => setValidationError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><X size={14} /></button>
        </div>
      )}

      {/* PDF loading indicator */}
      {isPdfLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 20, borderRadius: 14, background: accentLight, border: `1px solid ${accent}30` }}>
          <Loader2 size={22} style={{ color: accent }} className="upload-mgr-spin" />
          <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>
            Reading PDF{pdfProgress ? ` — page ${pdfProgress.current} / ${pdfProgress.total}` : '…'}
          </span>
          {pdfProgress && (
            <div style={{ width: '100%', maxWidth: 260, height: 5, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
              <div style={{ width: `${(pdfProgress.current / pdfProgress.total) * 100}%`, height: '100%', background: accent, transition: 'width 0.3s' }} />
            </div>
          )}
        </div>
      )}

      {/* Thumbnails grid */}
      {pages.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(136px, 1fr))', gap: 12 }}>
          {pages.map((page, index) => (
            <div
              key={page.id}
              draggable={!disabled}
              onDragStart={() => { dragSrcId.current = page.id; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(page.id); }}
              onDragEnd={() => setDragOverId(null)}
              onDrop={(e) => handlePageDrop(e, page.id)}
              style={{
                display: 'flex', flexDirection: 'column', borderRadius: 14,
                border: `2px solid ${dragOverId === page.id ? accent : page.status === 'error' ? '#fca5a5' : page.status === 'done' ? '#6ee7b7' : '#e2e8f0'}`,
                background: '#fff', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'border-color 0.15s, transform 0.15s',
                transform: dragOverId === page.id ? 'scale(1.03)' : 'scale(1)',
                userSelect: 'none',
              }}
            >
              {/* Thumbnail area */}
              <div style={{ position: 'relative', paddingTop: '133%', background: '#f8fafc', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.thumbnailUrl}
                  alt={`Page ${page.pageNum}`}
                  loading="lazy"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                />
                {/* Status badge */}
                {page.status !== 'ready' && (
                  <div style={{ position: 'absolute', top: 6, right: 6, padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: page.status === 'done' ? '#10b981' : page.status === 'error' ? '#ef4444' : page.status === 'processing' ? accent : '#64748b', color: '#fff' }}>
                    {page.status === 'processing' ? '⏳' : page.status === 'done' ? '✓' : page.status === 'error' ? '!' : '↷'}
                  </div>
                )}
                <div style={{ position: 'absolute', top: 6, left: 6, color: 'rgba(100,116,139,0.7)', cursor: 'grab' }}><GripVertical size={14} /></div>
                <button onClick={() => setZoomedPage(page)} style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.42)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '3px 5px', display: 'flex', alignItems: 'center' }}>
                  <ZoomIn size={13} />
                </button>
              </div>

              {/* Card footer */}
              <div style={{ padding: '8px 8px 6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>Page {page.pageNum}</span>
                  <div style={{ display: 'flex', gap: 1 }}>
                    <button onClick={() => movePage(index, -1)} disabled={index === 0 || disabled} title="Move up" style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? '#cbd5e1' : '#64748b', padding: '1px 2px' }}><ChevronUp size={14} /></button>
                    <button onClick={() => movePage(index, 1)} disabled={index === pages.length - 1 || disabled} title="Move down" style={{ background: 'none', border: 'none', cursor: index === pages.length - 1 ? 'default' : 'pointer', color: index === pages.length - 1 ? '#cbd5e1' : '#64748b', padding: '1px 2px' }}><ChevronDown size={14} /></button>
                  </div>
                </div>

                {page.status === 'error' && page.error && (
                  <div style={{ fontSize: 9.5, color: '#b91c1c', marginBottom: 4, lineHeight: 1.3 }}>{page.error}</div>
                )}

                <div style={{ display: 'flex', gap: 3 }}>
                  <button onClick={() => rotatePage(page.id)} disabled={disabled} title="Rotate 90°" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '5px 2px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', color: '#64748b', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                    <RotateCw size={11} /> Rotate
                  </button>
                  <button onClick={() => triggerReplace(page.id)} disabled={disabled} title="Replace" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '5px 2px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', color: '#64748b', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={11} /> Replace
                  </button>
                  <button onClick={() => deletePage(page.id)} disabled={disabled} title="Delete" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 6px', border: '1px solid #fecaca', borderRadius: 7, background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer' }}>
                    <X size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zoom modal */}
      {zoomedPage && (
        <div onClick={() => setZoomedPage(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomedPage.thumbnailUrl} alt={`Page ${zoomedPage.pageNum}`} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }} />
            <div style={{ textAlign: 'center', marginTop: 10, color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>Page {zoomedPage.pageNum} · click outside to close</div>
            <button onClick={() => setZoomedPage(null)} style={{ position: 'absolute', top: -14, right: -14, background: '#0f172a', border: 'none', borderRadius: '50%', color: '#fff', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Hidden replace input */}
      <input ref={replaceInput} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" style={{ display: 'none' }} onChange={handleReplaceFile} />

      <style>{`
        @keyframes upload-mgr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .upload-mgr-spin { animation: upload-mgr-spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
