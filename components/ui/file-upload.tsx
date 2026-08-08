/**
 * components/ui/file-upload.tsx
 * =============================================================
 * Reusable Drag-and-Drop File Upload Component
 * =============================================================
 * Supports drag-and-drop or file picker for images up to 10MB.
 * Renders an inline preview, upload progress bar, and remove button.
 * Sends POST requests to /api/upload.
 * =============================================================
 */

'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface FileUploadProps {
  onUploadComplete?: (url: string) => void;
  onRemove?: () => void;
  initialUrl?: string;
  label?: string;
  hint?: string;
}

export default function FileUpload({
  onUploadComplete,
  onRemove,
  initialUrl = '',
  label = 'Upload Gear Photo or Graph',
  hint = 'PNG, JPG, WEBP, or GIF up to 10MB',
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string>(initialUrl);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    setErrorMessage('');
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File exceeds the 10MB size limit.');
      return;
    }

    setUploading(true);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulated progress updates
      const interval = setInterval(() => {
        setProgress((prev) => (prev >= 85 ? prev : prev + 15));
      }, 150);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      const data = await response.json();

      if (response.ok && data.url) {
        setProgress(100);
        setPreviewUrl(data.url);
        if (onUploadComplete) {
          onUploadComplete(data.url);
        }
      } else {
        setErrorMessage(data.error || 'Failed to upload image.');
        setProgress(0);
      }
    } catch (err) {
      setErrorMessage('Network error during file upload.');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    setProgress(0);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="space-y-2 w-full font-sans">
      {label && (
        <label className="block text-xs font-semibold text-gray-700">
          {label}
        </label>
      )}

      {previewUrl ? (
        /* Preview State */
        <div className="relative rounded-2xl border border-gray-200 bg-gray-50 p-4 flex flex-col items-center justify-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Uploaded attachment preview"
            className="max-h-64 rounded-xl object-contain shadow-sm border border-gray-200"
          />
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-xs font-bold text-[#10b981] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              Uploaded Successfully
            </span>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-full transition-all duration-200 ease-in-out cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* Light Mode Modern Dropzone State */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 ease-in-out p-6 text-center flex flex-col items-center justify-center space-y-2.5 ${
            dragActive
              ? 'border-[#10b981] bg-[#e6f7f0]'
              : 'border-gray-300 bg-gray-50 hover:border-[#10b981] hover:bg-gray-100/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif"
            onChange={handleChange}
            className="hidden"
          />

          <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#10b981] shadow-xs">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-semibold text-gray-700">
              <span className="text-[#10b981] font-bold hover:underline">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 font-normal">{hint}</p>
          </div>

          {uploading && (
            <div className="w-full max-w-xs space-y-1.5 pt-2">
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10b981] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-[#10b981]">Uploading... {progress}%</span>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
