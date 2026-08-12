'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CreateCommunityModal from './CreateCommunityModal';
import { Flame, Globe, Bookmark, History, Settings, TrendingUp, Hash } from 'lucide-react';
import { useToast } from './Toast';

type CommunityItem = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  member_count: number;
};

export default function RedditSidebar({ communities }: { communities: CommunityItem[] }) {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'all' | 'saved' | 'history'>('popular');
  const [trendingTags, setTrendingTags] = useState<{tag: string, count: number}[]>([]);

  useEffect(() => {
    async function loadTrending() {
      try {
        const res = await fetch('/api/trending');
        if (res.ok) {
          const data = await res.json();
          // Strictly use DB data — no fabricated fallback
          setTrendingTags(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('Failed to load trending tags:', err);
      }
    }
    loadTrending();
  }, []);

  const handleTrendingClick = (tag: string) => {
    showToast(`Filtering posts by tag ${tag}`, 'info');
  };

  return (
    <aside className="w-full lg:w-60 flex-shrink-0 space-y-4 font-sans lg:sticky lg:top-20">
      {/* Navigation Menu Card */}
      <div className="bg-white border border-[#eaefec] rounded-2xl p-2 shadow-sm space-y-1">
        <Link
          href="/r"
          onClick={() => setActiveTab('popular')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 ease-in-out ${
            pathname === '/r' || activeTab === 'popular'
              ? 'bg-[#e6f7f0] text-[#10b981]'
              : 'text-[#4b5563] hover:bg-[#f8faf9] hover:text-[#111827]'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <span>Popular</span>
        </Link>

        <Link
          href="/r/all"
          onClick={() => setActiveTab('all')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ease-in-out ${
            activeTab === 'all'
              ? 'bg-[#e6f7f0] text-[#10b981]'
              : 'text-[#4b5563] hover:bg-[#f8faf9] hover:text-[#111827]'
          }`}
        >
          <Globe className="w-4 h-4 text-gray-400" />
          <span>All Communities</span>
        </Link>

        <button
          onClick={() => {
            setActiveTab('saved');
            showToast('Showing your saved posts collection', 'info');
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ease-in-out text-left cursor-pointer ${
            activeTab === 'saved'
              ? 'bg-[#e6f7f0] text-[#10b981]'
              : 'text-[#4b5563] hover:bg-[#f8faf9] hover:text-[#111827]'
          }`}
        >
          <Bookmark className="w-4 h-4 text-gray-400" />
          <span>Saved Posts</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            showToast('Loaded your recent reading history', 'info');
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ease-in-out text-left cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#e6f7f0] text-[#10b981]'
              : 'text-[#4b5563] hover:bg-[#f8faf9] hover:text-[#111827]'
          }`}
        >
          <History className="w-4 h-4 text-gray-400" />
          <span>Recent History</span>
        </button>

        <Link
          href="/settings"
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-[#4b5563] hover:bg-[#f8faf9] hover:text-[#111827] transition-all duration-200 ease-in-out text-left"
        >
          <Settings className="w-4 h-4 text-gray-400" />
          <span>Settings</span>
        </Link>
      </div>

      {/* Trending Today Card */}
      <div className="bg-white border border-[#eaefec] rounded-2xl p-5 shadow-sm space-y-4 font-sans">
        <h3 className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-[#10b981]" />
          <span>Trending Today</span>
        </h3>

        <div className="space-y-0.5">
          {trendingTags.length === 0 ? (
            <div className="py-3 text-center">
              <p className="text-xs text-gray-400 font-sans italic">
                No trending topics today.
              </p>
            </div>
          ) : (
            trendingTags.map((item) => (
              <div 
                key={item.tag} 
                onClick={() => handleTrendingClick(item.tag)}
                className="px-3 py-2 -mx-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-[#10b981] block">
                  {item.tag}
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  {item.count > 1000 ? (item.count / 1000).toFixed(1) + 'k' : item.count} posts this week
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <CreateCommunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </aside>
  );
}
