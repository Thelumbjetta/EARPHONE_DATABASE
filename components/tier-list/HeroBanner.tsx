'use client';

import type { TierListMeta } from './types';
import { Globe, Lock, Image as ImageIcon, Settings, Sparkles } from 'lucide-react';
import { useToast } from '../Toast';

interface Props {
  meta: TierListMeta;
}

export default function HeroBanner({ meta }: Props) {
  const { showToast } = useToast();

  return (
    <div className="bg-white border border-[#eaefec] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4 font-sans relative overflow-hidden mb-6">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="bg-[#e6f7f0] text-[#059669] border border-[#a7f3d0] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
              {meta.isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{meta.isPublic ? 'Public Consensus List' : 'Private Tier List'}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            {meta.title}
          </h1>

          {meta.description && (
            <p className="text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed font-normal">
              {meta.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0 flex-shrink-0">
          <button
            type="button"
            onClick={() => showToast('Banner image upload coming soon', 'info')}
            className="flex-1 sm:flex-initial bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#111827] font-bold text-xs px-4 py-2.5 rounded-full transition-all duration-200 ease-in-out flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-gray-200"
          >
            <ImageIcon className="w-4 h-4 text-gray-500" />
            <span>Upload Banner</span>
          </button>

          <button
            type="button"
            onClick={() => showToast('Settings modal coming soon', 'info')}
            className="flex-1 sm:flex-initial bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm transition-all duration-200 ease-in-out flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Settings className="w-4 h-4" />
            <span>Edit List</span>
          </button>
        </div>

      </div>

    </div>
  );
}
