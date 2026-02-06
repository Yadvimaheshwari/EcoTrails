'use client';

/**
 * Activity Modal Component
 * Handles different types of checkpoint activities
 */

import React, { useState, useRef } from 'react';
import { CheckpointActivity } from './CheckpointSheet';

interface ActivityModalProps {
  activity: CheckpointActivity;
  isCompleting: boolean;
  onComplete: (proof: any) => Promise<void>;
  onClose: () => void;
}

export function ActivityModal({ activity, isCompleting, onComplete, onClose }: ActivityModalProps) {
  const [proof, setProof] = useState<any>(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [observationCount, setObservationCount] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const startTimer = () => {
    setTimerStarted(true);
    setTimerElapsed(0);
    
    timerRef.current = setInterval(() => {
      setTimerElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSubmit = async () => {
    stopTimer();
    
    let proofData: any = {};

    switch (activity.type) {
      case 'photo_challenge':
        if (!photoFile) {
          alert('Please take a photo first');
          return;
        }
        proofData = { photo: photoFile, type: 'photo' };
        break;

      case 'trivia':
        if (!selectedAnswer) {
          alert('Please select an answer');
          return;
        }
        const criteria = activity.completion_criteria;
        const isCorrect = selectedAnswer === criteria.correct;
        proofData = { 
          answer: selectedAnswer, 
          correct: isCorrect,
          type: 'trivia'
        };
        break;

      case 'observation':
        proofData = { 
          count: observationCount,
          type: 'observation'
        };
        break;

      case 'audio_listen':
      case 'mindfulness':
        const requiredSeconds = activity.completion_criteria?.duration_seconds || 0;
        if (timerElapsed < requiredSeconds) {
          alert(`Please complete the full ${Math.floor(requiredSeconds / 60)} minute activity`);
          return;
        }
        proofData = { 
          duration: timerElapsed,
          completed: true,
          type: activity.type
        };
        break;

      case 'scavenger_hunt':
        if (!photoFile) {
          alert('Please photograph your findings');
          return;
        }
        proofData = { 
          photo: photoFile,
          count: observationCount,
          type: 'scavenger_hunt'
        };
        break;

      case 'exploration':
        proofData = { 
          completed: true,
          notes: proof?.notes || '',
          type: 'exploration'
        };
        break;

      default:
        proofData = { completed: true, type: 'generic' };
    }

    await onComplete(proofData);
  };

  const renderActivityContent = () => {
    switch (activity.type) {
      case 'photo_challenge':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium mb-1">📸 Photo Challenge</p>
              <p className="text-sm text-blue-700">{activity.prompt}</p>
            </div>
            
            {photoPreview ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview('');
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-mossGreen hover:bg-mossGreen/5 transition-colors"
                >
                  <span className="text-5xl mb-2">📷</span>
                  <span className="text-sm font-medium text-slate-600">Tap to capture photo</span>
                </button>
              </div>
            )}
          </div>
        );

      case 'trivia':
        const criteria = activity.completion_criteria;
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-800 font-medium mb-2">🧠 Trivia Challenge</p>
              <p className="text-sm text-purple-700 mb-3">{criteria.question}</p>
            </div>
            
            <div className="space-y-2">
              {criteria.options.map((option: string) => (
                <button
                  key={option}
                  onClick={() => setSelectedAnswer(option)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedAnswer === option
                      ? 'border-mossGreen bg-mossGreen/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-slate-900">{option}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'observation':
        const minCount = activity.completion_criteria?.minimum || 1;
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium mb-1">👁️ Observation</p>
              <p className="text-sm text-green-700">{activity.prompt}</p>
            </div>
            
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm text-slate-600">
                Minimum required: {minCount}
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setObservationCount(Math.max(0, observationCount - 1))}
                  className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xl font-bold"
                >
                  −
                </button>
                <div className="text-5xl font-bold text-mossGreen min-w-[80px] text-center">
                  {observationCount}
                </div>
                <button
                  onClick={() => setObservationCount(observationCount + 1)}
                  className="w-12 h-12 rounded-full bg-mossGreen hover:bg-mossGreen/90 text-white flex items-center justify-center text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        );

      case 'audio_listen':
      case 'mindfulness':
        const requiredSeconds = activity.completion_criteria?.duration_seconds || 300;
        const requiredMinutes = Math.floor(requiredSeconds / 60);
        const isTimerComplete = timerElapsed >= requiredSeconds;
        
        return (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-indigo-800 font-medium mb-1">
                {activity.type === 'audio_listen' ? '👂 Listening' : '🧘 Mindfulness'}
              </p>
              <p className="text-sm text-indigo-700">{activity.prompt}</p>
            </div>
            
            <div className="flex flex-col items-center gap-4 py-8">
              <div className={`text-6xl font-bold ${isTimerComplete ? 'text-emerald-600' : 'text-slate-700'}`}>
                {Math.floor(timerElapsed / 60)}:{(timerElapsed % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-sm text-slate-600">
                {isTimerComplete 
                  ? '✓ Time complete!' 
                  : `Minimum ${requiredMinutes} minute${requiredMinutes > 1 ? 's' : ''}`
                }
              </p>
              
              {!timerStarted ? (
                <button
                  onClick={startTimer}
                  className="px-8 py-3 bg-mossGreen text-white rounded-full font-medium hover:bg-mossGreen/90"
                >
                  Start Timer
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="px-8 py-3 bg-red-500 text-white rounded-full font-medium hover:bg-red-600"
                >
                  Stop Timer
                </button>
              )}
            </div>
          </div>
        );

      case 'scavenger_hunt':
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 font-medium mb-1">🔍 Scavenger Hunt</p>
              <p className="text-sm text-amber-700">{activity.prompt}</p>
              <p className="text-xs text-amber-600 mt-2">
                Find {activity.completion_criteria?.target_count || 3} different items
              </p>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm font-medium text-slate-700">Items found:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setObservationCount(Math.max(0, observationCount - 1))}
                  className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold"
                >
                  −
                </button>
                <span className="text-2xl font-bold text-mossGreen min-w-[40px] text-center">
                  {observationCount}
                </span>
                <button
                  onClick={() => setObservationCount(observationCount + 1)}
                  className="w-8 h-8 rounded bg-mossGreen hover:bg-mossGreen/90 text-white flex items-center justify-center text-sm font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {photoPreview ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview('');
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-mossGreen hover:bg-mossGreen/5"
                >
                  <span className="text-5xl mb-2">📷</span>
                  <span className="text-sm font-medium text-slate-600">Take photo of your findings</span>
                </button>
              </div>
            )}
          </div>
        );

      case 'exploration':
        return (
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <p className="text-sm text-teal-800 font-medium mb-1">🗺️ Exploration</p>
              <p className="text-sm text-teal-700">{activity.prompt}</p>
            </div>
            
            <textarea
              placeholder="Share what you discovered..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mossGreen resize-none"
              onChange={(e) => setProof({ ...proof, notes: e.target.value })}
            />
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">{activity.prompt}</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="font-display text-xl text-pineGreen font-bold">{activity.title}</h2>
            <p className="text-sm text-slate-600">{activity.description}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="text-2xl text-slate-400">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderActivityContent()}

          {activity.educational_note && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">💡 Did you know?</span> {activity.educational_note}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-amber-700 font-bold">+{activity.xp} XP</span>
            {activity.estimated_minutes && (
              <span className="text-slate-500 ml-3">⏱️ {activity.estimated_minutes} min</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isCompleting}
              className="px-6 py-2 bg-mossGreen text-white rounded-lg font-medium hover:bg-mossGreen/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCompleting ? 'Completing...' : 'Complete Activity'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
