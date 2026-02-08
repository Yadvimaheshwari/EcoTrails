'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { getSignedUploadUrl, registerUploadedMedia } from '@/lib/api';

interface FileUploadProps {
  hikeId: string;
}

export function FileUpload({ hikeId }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const [metadata, setMetadata] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    latitude: '',
    longitude: '',
    segmentId: '',
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      setUploading(true);
      setProgress(0);

      try {
        // Get signed URL
        const urlRes = await getSignedUploadUrl(hikeId, file.type);
        const { uploadUrl, mediaId } = urlRes.data;

        // Upload to S3 with progress tracking
        const xhr = new XMLHttpRequest();
        
        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setProgress((e.loaded / e.total) * 100);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(new Error('Upload failed'));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Upload failed')));
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        // Register media with metadata
        const registerMetadata: any = {};
        
        if (metadata.latitude && metadata.longitude) {
          registerMetadata.location = {
            lat: parseFloat(metadata.latitude),
            lng: parseFloat(metadata.longitude),
          };
        }

        if (metadata.timestamp) {
          registerMetadata.timestamp = metadata.timestamp;
        }

        if (metadata.segmentId) {
          registerMetadata.segmentId = metadata.segmentId;
        }

        // Try to extract image dimensions
        if (file.type.startsWith('image/')) {
          const img = new Image();
          await new Promise<void>((resolve) => {
          img.onload = () => {
            registerMetadata.width = img.width;
            registerMetadata.height = img.height;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = URL.createObjectURL(file);
          });
        }

        await registerUploadedMedia(mediaId, file.size, registerMetadata);

        setProgress(100);
        setTimeout(() => {
          setProgress(0);
          setShowMetadata(false);
          setMetadata({
            timestamp: new Date().toISOString().slice(0, 16),
            latitude: '',
            longitude: '',
            segmentId: '',
          });
        }, 1000);
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  }, [hikeId, metadata]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov'],
      'audio/*': ['.m4a', '.mp3'],
    },
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <p className="text-textSecondary mb-2">Uploading... {Math.round(progress)}%</p>
            <div className="w-full bg-border rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-textSecondary mb-2">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-textTertiary">or click to select</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowMetadata(!showMetadata)}
        className="text-sm text-primary hover:text-primaryDark"
      >
        {showMetadata ? 'Hide' : 'Add'} metadata (timestamp, location)
      </button>

      {showMetadata && (
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Timestamp</label>
            <input
              type="datetime-local"
              value={metadata.timestamp}
              onChange={(e) => setMetadata({ ...metadata, timestamp: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-surface"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Latitude</label>
              <input
                type="number"
                step="any"
                value={metadata.latitude}
                onChange={(e) => setMetadata({ ...metadata, latitude: e.target.value })}
                placeholder="37.7749"
                className="w-full px-4 py-2 rounded-lg border border-border bg-surface"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Longitude</label>
              <input
                type="number"
                step="any"
                value={metadata.longitude}
                onChange={(e) => setMetadata({ ...metadata, longitude: e.target.value })}
                placeholder="-122.4194"
                className="w-full px-4 py-2 rounded-lg border border-border bg-surface"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Trail Segment ID (optional)</label>
            <input
              type="text"
              value={metadata.segmentId}
              onChange={(e) => setMetadata({ ...metadata, segmentId: e.target.value })}
              placeholder="segment-123"
              className="w-full px-4 py-2 rounded-lg border border-border bg-surface"
            />
          </div>
        </div>
      )}
    </div>
  );
}
