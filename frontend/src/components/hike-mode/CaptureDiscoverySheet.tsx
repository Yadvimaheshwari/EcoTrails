'use client';

/**
 * CaptureDiscoverySheet - Sheet for capturing a discovery
 */

import React, { useState, useRef } from 'react';
import { DiscoveryNode, DISCOVERY_CATEGORIES, DiscoveryCategory } from '@/types/hikeMode';

interface CaptureDiscoverySheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: DiscoveryNode | null;
  nearbyNodes: DiscoveryNode[];
  onCapture: (
    nodeId: string,
    category: string,
    photoFile: File | null,
    note: string,
    confidence: number
  ) => Promise<void>;
}

export function CaptureDiscoverySheet({
  isOpen,
  onClose,
  selectedNode,
  nearbyNodes,
  onCapture,
}: CaptureDiscoverySheetProps) {
  const [selectedCategory, setSelectedCategory] = useState<DiscoveryCategory>(
    selectedNode?.category || 'landmark'
  );
  const [note, setNote] = useState('');
  const [confidence, setConfidence] = useState(80);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const nodeId = selectedNode?.id || `custom-${Date.now()}`;
      await onCapture(nodeId, selectedCategory, photoFile, note, confidence);
      
      // Reset form
      setNote('');
      setConfidence(80);
      setPhotoFile(null);
      setPhotoPreview(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = Object.entries(DISCOVERY_CATEGORIES) as [DiscoveryCategory, typeof DISCOVERY_CATEGORIES[DiscoveryCategory]][];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl text-pineGreen">
                {selectedNode ? 'Capture Discovery' : 'Log a Find'}
              </h2>
              {selectedNode && (
                <p className="text-sm text-textSecondary mt-1">{selectedNode.title}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Photo Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Photo (optional)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-2xl"
                />
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-mossGreen hover:bg-mossGreen/5 transition-colors"
              >
                <span className="text-3xl">📷</span>
                <span className="text-sm text-textSecondary">Tap to add photo</span>
              </button>
            )}
          </div>

          {/* Category Selection */}
          {!selectedNode && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-textSecondary mb-2">
                Category
              </label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      selectedCategory === key
                        ? 'ring-2 ring-pineGreen bg-pineGreen/10'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <span className="text-xs text-textSecondary">{info.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Notes (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you observe? Any interesting details?"
              className="w-full h-24 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-pineGreen/30 focus:border-pineGreen"
            />
          </div>

          {/* Confidence Slider */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-textSecondary">
                Confidence
              </label>
              <span className="text-sm font-medium text-pineGreen">{confidence}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pineGreen"
            />
            <div className="flex justify-between text-xs text-textSecondary mt-1">
              <span>Uncertain</span>
              <span>Very sure</span>
            </div>
          </div>

          {/* Nearby Suggestions */}
          {!selectedNode && nearbyNodes.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-textSecondary mb-2">
                Nearby discoveries
              </label>
              <div className="space-y-2">
                {nearbyNodes.slice(0, 3).map(node => {
                  const info = DISCOVERY_CATEGORIES[node.category];
                  return (
                    <button
                      key={node.id}
                      onClick={() => {
                        setSelectedCategory(node.category);
                      }}
                      className="w-full p-3 bg-discoveryGold/10 border border-discoveryGold/30 rounded-xl flex items-center gap-3 hover:bg-discoveryGold/20 transition-colors"
                    >
                      <span className="text-2xl">{info.icon}</span>
                      <div className="text-left">
                        <div className="font-medium text-text">{node.title}</div>
                        <div className="text-xs text-textSecondary">+{node.xp} XP</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-discoveryGold text-white rounded-2xl font-medium text-lg flex items-center justify-center gap-2 hover:bg-discoveryGold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <span>✨</span>
                Capture Discovery
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
