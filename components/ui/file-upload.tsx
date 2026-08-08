'use client';

import { useState } from 'react';
import { UploadDropzone } from '@/utils/uploadthing';
import { X } from 'lucide-react';

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
  hint = 'PNG, JPG, WEBP, or GIF up to 8MB',
}: FileUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(initialUrl);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleRemove = () => {
    setPreviewUrl('');
    setErrorMessage('');
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
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-full transition-all duration-200 ease-in-out cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        /* Uploadthing Dropzone */
        <div className="relative rounded-2xl border border-gray-200 bg-gray-50 transition-all duration-200 ease-in-out hover:border-[#10b981] hover:bg-[#e6f7f0]/50 p-2 overflow-hidden shadow-sm">
          <UploadDropzone
            endpoint="imageUploader"
            onClientUploadComplete={(res) => {
              if (res && res.length > 0) {
                const url = res[0].url;
                setPreviewUrl(url);
                setErrorMessage('');
                if (onUploadComplete) {
                  onUploadComplete(url);
                }
              }
            }}
            onUploadError={(error: Error) => {
              setErrorMessage(`Upload failed: ${error.message}`);
            }}
            appearance={{
              container: "border-none p-6 outline-none",
              label: "text-[#10b981] hover:underline font-bold text-sm",
              allowedContent: "text-gray-500 text-xs font-medium mt-2",
              button: "bg-[#10b981] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm mt-4 ut-uploading:bg-[#059669]",
            }}
            content={{
              allowedContent: hint
            }}
          />
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
