'use client';

import { useState, useEffect, useRef } from 'react';

interface ReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: string;
  hikeName?: string;
  onSave: (content: string) => Promise<void>;
}

export function ReflectionModal({ isOpen, onClose, initialContent = '', hikeName, onSave }: ReflectionModalProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave(content);
      onClose();
    } catch (error) {
      console.error('Failed to save reflection:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
      style={{ animation: 'fade-up 0.3s ease-out' }}
    >
      <div 
        className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          animation: 'fade-up 0.4s ease-out',
          border: '1px solid #E8E8E3'
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-textSecondary hover:text-text transition-colors"
          style={{ fontSize: '24px', lineHeight: '1' }}
        >
          ✕
        </button>
        
        <h2 className="text-3xl font-light mb-2 text-text">
          {initialContent ? 'Edit Reflection' : 'Add Reflection'}
        </h2>
        {hikeName && (
          <p className="text-sm text-textSecondary mb-6">{hikeName}</p>
        )}
        
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts about this hike... What did you discover? How did you feel? What made it memorable?"
          className="w-full h-64 p-4 rounded-2xl border border-border resize-none focus:outline-none focus:ring-2 focus:ring-alpineBlue/20 text-text"
          style={{ 
            backgroundColor: '#FAFAF8',
            borderColor: '#E8E8E3',
            fontSize: '16px',
            lineHeight: '1.6'
          }}
        />
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl font-medium transition-colors"
            style={{ 
              border: '1px solid #E8E8E3', 
              color: '#5F6F6A',
              backgroundColor: '#FAFAF8'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            className="flex-1 px-6 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 hover:shadow-lg"
            style={{ 
              backgroundColor: '#4F8A6B',
              backgroundImage: 'linear-gradient(to bottom, #4F8A6B, #0F3D2E)'
            }}
          >
            {saving ? 'Saving...' : 'Save Reflection'}
          </button>
        </div>
      </div>
    </div>
  );
}
