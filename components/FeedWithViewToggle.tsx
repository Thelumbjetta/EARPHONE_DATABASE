'use client';

import { useState } from 'react';
import PostCard from '@/components/PostCard';
import { LayoutGrid, List } from 'lucide-react';

type Post = {
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

export default function FeedWithViewToggle({ posts }: { posts: Post[] }) {
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');

  return (
    <>
      {/* View mode toggle row */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 bg-[#f3f5f4] p-1 rounded-lg">
          <button
            onClick={() => setViewMode('cards')}
            className={`p-1 rounded transition-all duration-200 ease-in-out ${
              viewMode === 'cards'
                ? 'text-gray-700 bg-white shadow-sm'
                : 'text-gray-400 hover:text-gray-700'
            }`}
            title="Cards View"
            aria-label="Switch to cards view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`p-1 rounded transition-all duration-200 ease-in-out ${
              viewMode === 'compact'
                ? 'text-gray-700 bg-white shadow-sm'
                : 'text-gray-400 hover:text-gray-700'
            }`}
            title="Compact List View"
            aria-label="Switch to compact list view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Post Feed */}
      <div className={viewMode === 'compact' ? 'space-y-1' : 'space-y-0'}>
        {posts.map((post) =>
          viewMode === 'compact' ? (
            // Compact list row
            <div
              key={post.id}
              className="bg-white border border-[#eaefec] rounded-xl px-4 py-2.5 flex items-center gap-3 hover:border-[#10b981] transition-all duration-200 group"
            >
              <span
                className={`text-xs font-extrabold w-8 text-center flex-shrink-0 ${
                  (post.score || 0) > 0 ? 'text-[#10b981]' : 'text-gray-400'
                }`}
              >
                {post.score || 0}
              </span>
              <a
                href={`/r/${post.community_slug || 'audiophile'}/thread/${post.id}`}
                className="flex-1 min-w-0"
              >
                <span className="text-sm font-bold text-[#111827] group-hover:text-[#10b981] transition-colors line-clamp-1 block">
                  {post.title}
                </span>
                <span className="text-[11px] text-gray-400 font-medium">
                  {post.community_name || `r/${post.community_slug}`} &bull; u/{post.author_username} &bull; {post.comment_count} comments
                </span>
              </a>
            </div>
          ) : (
            <PostCard key={post.id} post={post} />
          )
        )}
      </div>
    </>
  );
}
