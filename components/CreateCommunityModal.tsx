'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateCommunityModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/communities/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          icon_url: iconUrl.trim(),
          banner_url: bannerUrl.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create community');
      }

      onClose();
      router.push(`/r/${data.community.slug}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-full text-sm transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#10b981] text-white font-black text-sm flex items-center justify-center shadow-xs">
            r/
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111827]">Create a Community</h2>
            <p className="text-xs text-gray-500 font-normal">Build a subreddit for your audio niche</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Community Name (e.g. r/chifi or r/headphones)
            </label>
            <input
              type="text"
              required
              placeholder="r/chifi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#f8faf9] text-xs sm:text-sm text-[#111827] placeholder:text-gray-400 rounded-xl px-4 py-2.5 border border-gray-200 focus:outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200 ease-in-out font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe what belongs in this subreddit..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#f8faf9] text-xs sm:text-sm text-[#111827] placeholder:text-gray-400 rounded-xl px-4 py-2.5 border border-gray-200 focus:outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200 ease-in-out font-normal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Icon Image URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                className="w-full bg-[#f8faf9] text-xs text-[#111827] placeholder:text-gray-400 rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200 ease-in-out"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Banner Image URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full bg-[#f8faf9] text-xs text-[#111827] placeholder:text-gray-400 rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200 ease-in-out"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2.5 rounded-full bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs transition-all duration-200 ease-in-out shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
