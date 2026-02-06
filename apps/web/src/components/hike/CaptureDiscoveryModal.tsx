/**
 * CaptureDiscoveryModal Component
 * Modal for capturing a discovery with photo upload and notes
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { DiscoveryWithDistance, DISCOVERY_ICONS, DISCOVERY_COLORS } from '@/types/discovery';
import { Badge } from '@/types/badge';

interface CaptureDiscoveryModalProps {
  isOpen: boolean;
  discovery: DiscoveryWithDistance | null;
  onClose: () => void;
  onCapture: (data: CaptureData) => Promise<{ badge: Badge | null; success: boolean }>;
}

export interface CaptureData {
  discoveryId: string;
  photo?: File;
  notes?: string;
  location: { lat: number; lng: number };
}

export function CaptureDiscoveryModal({
  isOpen,
  discovery,
  onClose,
  onCapture,
}: CaptureDiscoveryModalProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPhoto(null);
      setPhotoPreview(null);
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setPhoto(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!discovery) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onCapture({
        discoveryId: discovery.id,
        photo: photo || undefined,
        notes: notes.trim() || undefined,
        location: { lat: discovery.lat, lng: discovery.lng },
      });

      if (result.success) {
        onClose();
      } else {
        setError('Failed to capture discovery. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Capture error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !discovery) return null;

  const icon = DISCOVERY_ICONS[discovery.type];
  const color = DISCOVERY_COLORS[discovery.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
        style={{ animation: 'scaleIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div 
          className="px-5 py-4 flex items-center gap-3"
          style={{ backgroundColor: `${color}15` }}
        >
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}25` }}
          >
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Capture Discovery
            </h2>
            <p className="text-sm text-slate-600">{discovery.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/50 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Photo Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Add a photo (optional)
            </label>
            
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <button
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600">
                    Tap to take a photo or upload
                  </p>
                  <p className="text-xs text-slate-400">
                    JPG, PNG up to 10MB
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you observe? Any interesting details?"
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              disabled={isSubmitting}
            />
          </div>

          {/* Discovery Info */}
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              {discovery.shortText}
            </p>
            {discovery.difficulty && discovery.difficulty !== 'common' && (
              <p className="mt-2 text-xs text-slate-500">
                🎖️ This is a <span className="font-medium">{discovery.difficulty}</span> discovery!
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white rounded-xl font-medium transition-all hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <span>✨</span>
                Capture
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
