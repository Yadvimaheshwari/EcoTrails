'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TranscriptionResult {
  transcription: string;
  duration: number;
  language?: string;
  confidence?: number;
  timestamp: string;
}

interface VoiceTranscriberProps {
  hikeId?: string;
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  autoSave?: boolean;
}

export function VoiceTranscriber({ hikeId, onTranscriptionComplete, autoSave = false }: VoiceTranscriberProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const visualizeAudio = (stream: MediaStream) => {
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    analyserRef.current.fftSize = 256;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateWaveform = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      const normalized = Array.from(dataArray.slice(0, 20)).map(v => v / 255);
      setWaveformData(normalized);
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    };

    updateWaveform();
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setWaveformData([]);
        
        if (autoSave) {
          await transcribeAudio(blob);
        }
      };

      visualizeAudio(stream);
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Recording error:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'voice-note.webm');
      if (hikeId) {
        formData.append('hike_id', hikeId);
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/companion/transcribe`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          timeout: 60000,
        }
      );

      if (response.data.success) {
        const result = {
          transcription: response.data.transcription,
          duration: recordingTime,
          language: response.data.language,
          confidence: response.data.confidence,
          timestamp: new Date().toISOString()
        };
        setTranscription(result);
        onTranscriptionComplete?.(result);
      } else {
        setError(response.data.error || 'Transcription failed');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const reset = () => {
    setTranscription(null);
    setAudioBlob(null);
    setRecordingTime(0);
    setError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Recording Interface */}
      {!transcription && !isTranscribing && (
        <div
          className="rounded-3xl overflow-hidden transition-all duration-300"
          style={{
            background: isRecording 
              ? 'linear-gradient(135deg, #F4A340 0%, #FF6B6B 100%)' 
              : 'linear-gradient(135deg, #4C7EF3 0%, #7B68EE 100%)',
            boxShadow: isRecording ? '0 20px 60px rgba(244, 163, 64, 0.4)' : '0 20px 60px rgba(76, 126, 243, 0.3)'
          }}
        >
          <div className="p-8 text-white">
            {/* Header */}
            <div className="text-center mb-8">
              <div 
                className="w-20 h-20 mx-auto rounded-full mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <span className="text-4xl">
                  {isRecording ? '🎙️' : '🎤'}
                </span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">
                {isRecording ? (isPaused ? 'Recording Paused' : 'Recording...') : 'Voice Note'}
              </h3>
              <p className="text-white/90">
                {isRecording ? 'Capture your thoughts on the trail' : 'Tap to start recording your voice note'}
              </p>
            </div>

            {/* Waveform Visualization */}
            {isRecording && !isPaused && (
              <div className="flex items-center justify-center gap-1 mb-8 h-24">
                {waveformData.map((value, idx) => (
                  <div
                    key={idx}
                    className="bg-white/80 rounded-full transition-all duration-75"
                    style={{
                      width: '4px',
                      height: `${Math.max(8, value * 80)}px`,
                      opacity: 0.8 + (value * 0.2)
                    }}
                  />
                ))}
                {waveformData.length === 0 && Array.from({ length: 20 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white/40 rounded-full"
                    style={{ width: '4px', height: '8px' }}
                  />
                ))}
              </div>
            )}

            {/* Timer */}
            {isRecording && (
              <div className="text-center mb-8">
                <div 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-2xl font-mono"
                  style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                >
                  {!isPaused && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                  {formatTime(recordingTime)}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all hover:scale-110 active:scale-95 shadow-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#4C7EF3' }}
                >
                  ⏺
                </button>
              ) : (
                <>
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    {isPaused ? '▶️' : '⏸'}
                  </button>
                  <button
                    onClick={stopRecording}
                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all hover:scale-110 active:scale-95 shadow-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#F4A340' }}
                  >
                    ⏹
                  </button>
                </>
              )}
            </div>

            {/* Transcribe Button */}
            {audioBlob && !autoSave && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => transcribeAudio(audioBlob)}
                  className="px-8 py-4 rounded-2xl font-semibold transition-all hover:shadow-lg active:scale-95"
                  style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#1B1F1E' }}
                >
                  ✨ Transcribe with Gemini AI
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcribing State */}
      {isTranscribing && (
        <div
          className="rounded-3xl p-12 text-center"
          style={{ background: 'linear-gradient(135deg, #4F8A6B 0%, #5AB88C 100%)', color: 'white' }}
        >
          <div className="w-20 h-20 border-4 border-t-transparent border-white rounded-full animate-spin mx-auto mb-6" />
          <h3 className="text-2xl font-semibold mb-3">Transcribing with Gemini AI...</h3>
          <p className="text-white/90">Converting your voice to text</p>
        </div>
      )}

      {/* Error Display */}
      {error && !isRecording && (
        <div 
          className="p-6 rounded-3xl mb-4"
          style={{ backgroundColor: '#FFF5F5', border: '2px solid #FED7D7' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-semibold text-red-700 mb-2">Error</h4>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{ backgroundColor: '#F56565', color: 'white' }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transcription Result */}
      {transcription && (
        <div
          className="rounded-3xl overflow-hidden animate-slide-in"
          style={{ backgroundColor: '#FFFFFF', border: '2px solid #4C7EF3', boxShadow: '0 20px 60px rgba(76, 126, 243, 0.2)' }}
        >
          <div 
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #4C7EF3 0%, #7B68EE 100%)', color: 'white' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <h4 className="font-semibold">Transcription Complete</h4>
                <p className="text-sm text-white/80">{formatTime(transcription.duration)}</p>
              </div>
            </div>
            {transcription.confidence && (
              <div className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                {Math.round(transcription.confidence * 100)}% confidence
              </div>
            )}
          </div>

          <div className="p-6">
            <div 
              className="p-6 rounded-2xl mb-4"
              style={{ backgroundColor: '#F6F8F7' }}
            >
              <p className="text-lg text-text leading-relaxed">
                {transcription.transcription}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 px-6 py-3 rounded-xl font-medium transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #4C7EF3 0%, #7B68EE 100%)', color: 'white' }}
              >
                Record Another
              </button>
              {hikeId && (
                <button
                  className="px-6 py-3 rounded-xl font-medium transition-all hover:shadow-lg"
                  style={{ backgroundColor: '#F6F8F7', border: '1px solid #E8E8E3', color: '#1B1F1E' }}
                >
                  Save to Journal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
