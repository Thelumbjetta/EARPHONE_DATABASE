'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ChevronUp, ChevronDown, MessageSquare, Share2, Bookmark, Check } from 'lucide-react';
import { useToast } from './Toast';

export type PostCardProps = {
  post: {
    id: number;
    title: string;
    body: string;
    score: number;
    created_at: string | Date;
    author_username: string;
    author_avatar?: string | null;
    community_name?: string;
    community_slug?: string;
    community_icon?: string | null;
    comment_count: number;
    user_vote?: number;
    media_urls?: string[];
  };
};

export default function PostCard({ post }: PostCardProps) {
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [currentVote, setCurrentVote] = useState<number>(post.user_vote || 0);
  const [score, setScore] = useState<number>(post.score || 0);
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleVote = async (e: React.MouseEvent, targetVote: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      showToast('Please sign in to vote!', 'info');
      return;
    }

    if (isVoting) return;
    setIsVoting(true);

    const newVote = currentVote === targetVote ? 0 : targetVote;
    const voteDelta = newVote - currentVote;

    // Optimistic UI Update
    setCurrentVote(newVote);
    setScore((prev) => prev + voteDelta);

    try {
      const res = await fetch('/api/posts/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: post.id,
          vote_value: newVote,
        }),
      });

      if (!res.ok) {
        setCurrentVote(currentVote);
        setScore(post.score || 0);
      } else {
        showToast(newVote === 1 ? 'Upvoted post!' : newVote === -1 ? 'Downvoted post' : 'Vote removed', 'success');
      }
    } catch (err) {
      console.error('Vote failed:', err);
      setCurrentVote(currentVote);
      setScore(post.score || 0);
    } finally {
      setIsVoting(false);
    }
  };

  // Relative time helper (e.g. 2h ago, 4h ago)
  const getRelativeTime = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 3600) {
      const mins = Math.max(1, Math.floor(diffInSeconds / 60));
      return `${mins}m ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  };

  const formattedTime = getRelativeTime(post.created_at);
  const communitySlug = post.community_slug || 'webdev';
  const communityName = post.community_name || `r/${communitySlug}`;

  // Format vote count numbers like 1.2k, 2.4k
  const formatScore = (num: number) => {
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.origin + `/r/${communitySlug}/thread/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.title, url });
    } else {
      navigator.clipboard.writeText(url);
      showToast('Thread link copied to clipboard!', 'success');
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    showToast(nextSaved ? 'Post saved to your collection!' : 'Post removed from saved', 'info');
  };

  return (
    <div className="group bg-white border border-[#eaefec] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ease-in-out flex mb-4 font-sans">
      {/* Left Upvote / Downvote Bar */}
      <div className="bg-[#f8faf9] w-12 sm:w-14 flex flex-col items-center py-3.5 px-1 flex-shrink-0 select-none border-r border-[#eaefec] justify-start gap-1">
        {/* Upvote Button */}
        <button
          onClick={(e) => handleVote(e, 1)}
          className={`p-1 rounded-md transition-all duration-200 ease-in-out cursor-pointer ${
            currentVote === 1
              ? 'text-[#10b981] bg-[#e6f7f0]'
              : 'text-gray-400 hover:text-[#10b981] hover:bg-gray-200/50'
          }`}
          title="Upvote"
          aria-label="Upvote post"
        >
          <div className={`p-1 rounded transition-all duration-200 ease-in-out ${currentVote === 1 ? 'bg-[#10b981] text-white' : 'bg-[#e6f7f0] text-[#10b981]'}`}>
            <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </button>

        {/* Score Counter */}
        <span
          className={`text-xs font-extrabold my-0.5 font-sans transition-all duration-200 ease-in-out ${
            currentVote === 1
              ? 'text-[#10b981]'
              : currentVote === -1
              ? 'text-red-500'
              : 'text-[#111827]'
          }`}
        >
          {formatScore(score)}
        </span>

        {/* Downvote Button */}
        <button
          onClick={(e) => handleVote(e, -1)}
          className={`p-1 rounded-md transition-all duration-200 ease-in-out cursor-pointer ${
            currentVote === -1
              ? 'text-red-500 bg-red-50'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'
          }`}
          title="Downvote"
          aria-label="Downvote post"
        >
          <div className={`p-1 rounded transition-all duration-200 ease-in-out ${currentVote === -1 ? 'bg-red-500 text-white' : 'text-gray-400'}`}>
            <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-2.5">
        <div>
          {/* Metadata Header */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5 flex-wrap">
            <Link
              href={`/r/${communitySlug}`}
              className="font-bold text-[#111827] hover:text-[#10b981] transition-all duration-200 ease-in-out"
            >
              {communityName}
            </Link>

            <span>&bull;</span>
            <span>Posted by</span>
            <Link href={`/u/${post.author_username}`} className="font-semibold text-gray-600 hover:text-[#10b981] transition-colors">
              u/{post.author_username}
            </Link>
            <span>&bull;</span>
            <span className="text-gray-400 font-normal">{formattedTime}</span>
          </div>

          {/* Title */}
          <Link href={`/r/${communitySlug}/thread/${post.id}`}>
            <h2 className="text-base sm:text-lg font-extrabold text-[#111827] group-hover:text-[#10b981] transition-all duration-200 ease-in-out leading-snug mb-1.5 font-sans">
              {post.title}
            </h2>
          </Link>

          {/* Body Snippet */}
          {post.body && (
            <p className="text-xs sm:text-sm text-[#4b5563] line-clamp-3 font-normal leading-relaxed mb-3">
              {post.body}
            </p>
          )}

          {/* Media Attachment */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="my-3 overflow-hidden rounded-xl border border-gray-100 bg-gray-100 max-h-[420px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.media_urls[0]}
                alt="Post attachment preview"
                className="w-full h-full object-cover group-hover:scale-[1.01] transition-all duration-300 ease-in-out"
              />
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center gap-2 pt-1 text-xs font-bold text-[#374151]">
          <Link
            href={`/r/${communitySlug}/thread/${post.id}`}
            className="bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#374151] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
            <span>{post.comment_count} Comments</span>
          </Link>

          <button
            onClick={handleShare}
            className="bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#374151] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out cursor-pointer active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-500" />
            <span>Share</span>
          </button>

          <button
            onClick={handleSave}
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out cursor-pointer active:scale-95 ${
              isSaved
                ? 'bg-[#e6f7f0] text-[#10b981]'
                : 'bg-[#f3f5f4] hover:bg-[#e8ebea] text-[#374151]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
