/**
 * components/CreateThreadForm.tsx
 * =============================================================
 * Interactive Create Thread Form Component
 * =============================================================
 * Integrates drag-and-drop FileUpload, category dropdown,
 * and POST submission to /api/forum/threads.
 * =============================================================
 */

'use client';

import { useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FileUpload from '@/components/ui/file-upload';
import type { ForumCategory } from '@/lib/forum-queries';

interface CreateThreadFormProps {
  categories: ForumCategory[];
  preselectedCategoryId?: string;
}

export default function CreateThreadForm({ categories, preselectedCategoryId }: CreateThreadFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [categoryId, setCategoryId] = useState<string>(preselectedCategoryId || '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [devUserId, setDevUserId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatusMessage('');

    if (!categoryId) {
      setStatusMessage('Please select a board section.');
      return;
    }

    if (!title.trim()) {
      setStatusMessage('Thread title cannot be empty.');
      return;
    }

    if (!body.trim()) {
      setStatusMessage('Opening post content cannot be empty.');
      return;
    }

    setLoading(true);
    setStatusMessage('Publishing thread...');

    try {
      const response = await fetch('/api/forum/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: parseInt(categoryId, 10),
          user_id: session?.user ? undefined : parseInt(devUserId, 10),
          title: title.trim(),
          body: body.trim(),
          media_url: mediaUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.thread?.id) {
        setStatusMessage('Thread published! Redirecting...');
        router.push(`/forum/threads/${data.thread.id}`);
      } else {
        setStatusMessage(data.error || 'Failed to publish thread.');
        setLoading(false);
      }
    } catch (err) {
      setStatusMessage('Network error during thread creation.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-[#eaefec] rounded-2xl p-6 sm:p-8 shadow-sm font-sans">
      
      {/* Board Category Selector */}
      <div>
        <label htmlFor="thread-category-select" className="block text-xs font-semibold text-gray-700 mb-2">
          Board Section <span className="text-[#10b981]">*</span>
        </label>
        <select
          id="thread-category-select"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full bg-[#f8faf9] border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#111827] focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 focus:outline-none transition-all duration-200 ease-in-out font-medium"
        >
          <option value="" disabled className="bg-white text-gray-400">
            — Select a board section —
          </option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id.toString()} className="bg-white text-[#111827]">
              {cat.name} ({cat.slug})
            </option>
          ))}
        </select>
      </div>

      {/* Thread Title */}
      <div>
        <label htmlFor="thread-title-input" className="block text-xs font-semibold text-gray-700 mb-2">
          Thread Title <span className="text-[#10b981]">*</span>
        </label>
        <input
          id="thread-title-input"
          type="text"
          required
          maxLength={300}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Be specific — e.g. 'Moondrop Aria 2 Review: Worth the Upgrade?'"
          className="w-full bg-[#f8faf9] border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 focus:outline-none transition-all duration-200 ease-in-out font-semibold"
        />
        <span className="text-[11px] text-gray-400 mt-1 block">Max 300 characters</span>
      </div>

      {/* Thread Opening Post Body */}
      <div>
        <label htmlFor="thread-body-input" className="block text-xs font-semibold text-gray-700 mb-2">
          Opening Post (OP) Content <span className="text-[#10b981]">*</span>
        </label>
        <textarea
          id="thread-body-input"
          rows={8}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your post here. Include sound impressions, listening gear, test tracks, or measurements..."
          className="w-full bg-[#f8faf9] border border-gray-200 rounded-2xl p-4 text-sm text-[#111827] placeholder:text-gray-400 focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 focus:outline-none transition-all duration-200 ease-in-out font-sans leading-relaxed"
        />
      </div>

      {/* Drag-and-Drop File Upload Component */}
      <FileUpload
        label="Attach Measurement Graph or Gear Photo (Optional):"
        initialUrl={mediaUrl}
        onUploadComplete={(url) => setMediaUrl(url)}
        onRemove={() => setMediaUrl('')}
      />

      {/* Dev User ID input if not logged in */}
      {!session?.user && (
        <div>
          <label htmlFor="dev-user-id-input" className="block text-xs font-semibold text-gray-700 mb-1">
            Guest User ID <span className="text-gray-400 font-normal">(Sign in above to post under your user profile)</span>:
          </label>
          <input
            id="dev-user-id-input"
            type="number"
            min="1"
            value={devUserId}
            onChange={(e) => setDevUserId(e.target.value)}
            className="w-full sm:w-48 bg-[#f8faf9] border border-gray-200 rounded-xl px-4 py-2 text-xs text-[#111827] focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 focus:outline-none transition-all duration-200 ease-in-out"
          />
        </div>
      )}

      {/* Submit Button & Status */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold text-sm py-3.5 rounded-full shadow-sm transition-all duration-200 ease-in-out active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? 'Publishing Thread...' : 'Publish Thread'}
        </button>

        {statusMessage && (
          <span className="block text-xs font-semibold text-[#059669] mt-3 text-center bg-[#e6f7f0] border border-[#a7f3d0] px-4 py-2 rounded-full">
            {statusMessage}
          </span>
        )}
      </div>

    </form>
  );
}
