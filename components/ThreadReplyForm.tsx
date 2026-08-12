'use client';

import { useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import FileUpload from '@/components/ui/file-upload';
import LoginModal from '@/components/LoginModal';

interface ThreadReplyFormProps {
  threadId: number;
}

export default function ThreadReplyForm({ threadId }: ThreadReplyFormProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // ── Auth gate ─────────────────────────────────────────────────────────
    if (!session?.user) {
      setShowLoginModal(true);
      return;
    }

    if (!content.trim()) {
      setStatusMessage('Reply content cannot be empty.');
      setStatusType('error');
      return;
    }

    setLoading(true);
    setStatusMessage('Submitting reply...');
    setStatusType('info');

    try {
      const response = await fetch(`/api/forum/threads/${threadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          media_url: mediaUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatusMessage('Reply posted!');
        setStatusType('success');
        setContent('');
        setMediaUrl('');
        setTimeout(() => window.location.reload(), 600);
      } else {
        setStatusMessage(data.error || 'Failed to submit reply.');
        setStatusType('error');
        setLoading(false);
      }
    } catch {
      setStatusMessage('Network error. Please check your connection.');
      setStatusType('error');
      setLoading(false);
    }
  };

  return (
    <>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="Sign in to post a reply"
      />

      <div className="rounded-2xl border border-[#eaefec] bg-white p-5 sm:p-6 space-y-5 shadow-sm font-sans">

        <div className="flex items-center justify-between border-b border-[#eaefec] pb-4">
          <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
            <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Post a Reply
          </h2>
          {session?.user ? (
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1.5 bg-[#e6f7f0] px-3 py-1 rounded-full border border-[#a7f3d0]">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              Posting as <strong>{session.user.name || session.user.email}</strong>
            </span>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-xs text-[#10b981] font-bold hover:underline cursor-pointer"
            >
              Sign in to reply →
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reply-content-input" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Your Response:
            </label>
            <textarea
              id="reply-content-input"
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onClick={() => { if (!session?.user) setShowLoginModal(true); }}
              placeholder={session?.user ? "Share your sound impressions, equipment details, or measurements..." : "Sign in to post a reply..."}
              readOnly={!session?.user}
              className="w-full bg-[#f8faf9] border border-gray-200 rounded-xl p-4 text-xs sm:text-sm text-[#111827] placeholder:text-gray-400 focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 focus:outline-none transition-all duration-200 ease-in-out font-sans leading-relaxed"
            />
          </div>

          {session?.user && (
            <>
              <FileUpload
                label="Attach Measurement Graph or Gear Photo (Optional):"
                initialUrl={mediaUrl}
                onUploadComplete={(url) => setMediaUrl(url)}
                onRemove={() => setMediaUrl('')}
              />

              {!mediaUrl && (
                <div>
                  <label htmlFor="reply-media-url-input" className="block text-xs font-medium text-gray-500 mb-1">
                    Or paste direct Image URL:
                  </label>
                  <input
                    id="reply-media-url-input"
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/image.png"
                    className="w-full bg-[#f8faf9] border border-gray-200 rounded-xl px-4 py-2 text-xs text-[#111827] placeholder:text-gray-400 focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 focus:outline-none transition-all duration-200 ease-in-out"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-sm transition-all duration-200 ease-in-out active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {loading ? 'Submitting...' : session?.user ? 'Submit Reply' : 'Sign in to Reply'}
            </button>

            {statusMessage && (
              <span
                className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                  statusType === 'error'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : statusType === 'success'
                    ? 'bg-[#e6f7f0] text-[#059669] border border-[#a7f3d0]'
                    : 'bg-blue-50 text-blue-600 border border-blue-200'
                }`}
              >
                {statusMessage}
              </span>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
