import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { getRedditPosts, getUserStats } from '@/lib/reddit-queries';
import PostCard from '@/components/PostCard';
import { Zap, Eye } from 'lucide-react';

export const revalidate = 0;

export default async function UserProfilePage(props: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await props.params;
  const { tab: activeTab = 'posts' } = await props.searchParams;

  const session = await auth();
  const currentUserId = session?.user?.id ? parseInt(session.user.id, 10) : undefined;

  // Fetch stats and posts for profile
  const stats = await getUserStats();
  const posts = await getRedditPosts({
    communitySlug: 'all',
    currentUserId,
    sortBy: 'hot',
    limit: 20,
  });

  // Filter posts by user or simulate tab views
  const userPosts = posts.filter((p) => p.author_username.toLowerCase() === username.toLowerCase()) || posts.slice(0, 2);
  const upvotedPosts = posts.filter((p) => p.user_vote === 1) || posts.slice(0, 2);

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      
      {/* ── User Header Card ──────────────────────────────────────────────── */}
      <div className="bg-white border border-[#eaefec] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#10b981] text-white flex items-center justify-center font-extrabold text-2xl shadow-md border-2 border-white">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">
                u/{username}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Audiophile Enthusiast &bull; Member since Jan 2025
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="bg-[#e6f7f0] text-[#059669] border border-[#a7f3d0] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> {stats.karma.toLocaleString()} karma
                </span>
                <span className="bg-[#f8faf9] text-gray-600 border border-gray-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Eye className="w-3 h-3" /> {stats.view_count.toLocaleString()} views
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Message CTA */}
          <div className="flex items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0">
            <Link
              href={`/messages?to=${encodeURIComponent(username)}`}
              className="flex-1 sm:flex-initial bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm transition-all duration-200 ease-in-out active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Message</span>
            </Link>
          </div>

        </div>
      </div>


      {/* ── Tabbed Navigation (Posts, Comments, Upvoted, Saved) ──────────── */}
      <div className="bg-white border border-[#eaefec] rounded-2xl p-2 shadow-sm flex items-center gap-1 overflow-x-auto scrollbar-none">
        <Link
          href={`/u/${username}?tab=posts`}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 ease-in-out ${
            activeTab === 'posts'
              ? 'bg-[#e6f7f0] text-[#10b981] border border-[#a7f3d0]'
              : 'text-gray-600 hover:bg-[#f8faf9] hover:text-[#111827]'
          }`}
        >
          Posts ({userPosts.length})
        </Link>

        <Link
          href={`/u/${username}?tab=comments`}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 ease-in-out ${
            activeTab === 'comments'
              ? 'bg-[#e6f7f0] text-[#10b981] border border-[#a7f3d0]'
              : 'text-gray-600 hover:bg-[#f8faf9] hover:text-[#111827]'
          }`}
        >
          Comments (14)
        </Link>

        <Link
          href={`/u/${username}?tab=upvoted`}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 ease-in-out ${
            activeTab === 'upvoted'
              ? 'bg-[#e6f7f0] text-[#10b981] border border-[#a7f3d0]'
              : 'text-gray-600 hover:bg-[#f8faf9] hover:text-[#111827]'
          }`}
        >
          Upvoted ({upvotedPosts.length})
        </Link>

        <Link
          href={`/u/${username}?tab=saved`}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 ease-in-out ${
            activeTab === 'saved'
              ? 'bg-[#e6f7f0] text-[#10b981] border border-[#a7f3d0]'
              : 'text-gray-600 hover:bg-[#f8faf9] hover:text-[#111827]'
          }`}
        >
          Saved (3)
        </Link>
      </div>


      {/* ── Tab Content Area ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {activeTab === 'posts' && (
          <div>
            {userPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="bg-white border border-[#eaefec] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Recent Comments by u/{username}
            </h3>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#f8faf9] border border-gray-200 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-bold text-[#111827]">Commented on Moondrop Blessing 3 vs Dusk</span>
                  <span>2h ago</span>
                </div>
                <p className="text-xs text-[#374151] leading-relaxed">
                  The pinna gain alignment is crisp without being shouty. Pairing it with a CS43198 dongle DAC yields fantastic sub-bass extension.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f8faf9] border border-gray-200 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-bold text-[#111827]">Commented on USB-C Dongle DAC Guide</span>
                  <span>1d ago</span>
                </div>
                <p className="text-xs text-[#374151] leading-relaxed">
                  Agreed! Modern dual DAC chips in dongles render heavy desktop amps redundant for portable IEM listening.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upvoted' && (
          <div>
            {upvotedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {activeTab === 'saved' && (
          <div>
            {posts.slice(0, 1).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
