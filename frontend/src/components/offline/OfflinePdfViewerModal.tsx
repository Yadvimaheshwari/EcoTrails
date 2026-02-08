'use client';

import { useEffect } from 'react';

interface OfflinePdfViewerModalProps {
  isOpen: boolean;
  title?: string;
  blobUrl: string | null;
  onClose: () => void;
}

export function OfflinePdfViewerModal({ isOpen, title, blobUrl, onClose }: OfflinePdfViewerModalProps) {
  useEffect(() => {
    // cleanup is handled by the caller when it revokes blob URLs (if desired)
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{title || 'Offline Map'}</div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
          >
            Close
          </button>
        </div>

        {!blobUrl ? (
          <div className="p-8 text-center text-slate-600">No offline PDF available.</div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Tip: if your browser can’t render PDFs inline, use “Download file”.
              </div>
              <a
                href={blobUrl}
                download={(title || 'offline-map') + '.pdf'}
                className="text-sm text-blue-600 hover:underline"
              >
                Download file
              </a>
            </div>

            <div className="w-full bg-slate-50 rounded-xl overflow-hidden" style={{ height: '75vh' }}>
              <iframe
                src={blobUrl}
                title={title || 'Offline Map PDF'}
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

