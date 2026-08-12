import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { getRedditPosts, getUserStats } from '@/lib/reddit-queries';
import pool from '@/lib/db';
import PostCard from '@/components/PostCard';
import { Zap, Eye, MessageSquare, BookmarkIcon } from 'lucide-react';

export const revalidate = 0;

// Fetch real comments for this user from the DB
async function getUserComments(username: string) {
  try {
    const res = await pool.query<{
      id: number;
      content: string;
      created_at: string;
      thread_id: number;
      thread_title: string;
    }>(`
      SELECT 
        c.id,
        c.content,
        c.created_at,
        t.id AS thread_id,
        t.title AS thread_title
      FROM comments c
      JOIN threads t ON c.thread_id = t.id
      JOIN users u ON c.user_id = u.id
      WHERE u.username = $1
      ORDER BY c.created_at DESC
      LIMIT 20
    `, [username]);
    return res.rows;
  } catch {
    return [];
  }
}

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function UserProfilePage(props: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await props.params;
  const { tab: activeTab = 'posts' } = await props.searchParams;

  const session = await auth();
  const currentUserId = session?.user?.id ? parseInt(session.user.id, 10) : undefined;

  // Real DB data only
  const stats = await getUserStats(currentUserId);
  const posts = await getRedditPosts({ communitySlug: 'all', currentUserId, sortBy: 'hot', limit: 20 });
  const comments = await getUserComments(username);

  const userPosts = posts.filter((p) => p.author_username.toLowerCase() === username.toLowerCase());
  const upvotedPosts = posts.filter((p) => p.user_vote === 1);

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
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827]">u/{username}</h1>
              <p className="text-xs text-gray-500 font-medium">Audiophile Member</p>
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

      {/* ── Tabbed Navigation ──────────────────────────────────────────────── */}
      <div className="bg-white border border-[#eaefec] rounded-2xl p-2 shadow-sm flex items-center gap-1 overflow-x-auto scrollbar-none">
        {[
          { tab: 'posts',    label: `Posts (${userPosts.length})`,     Icon: null },
          { tab: 'comments', label: `Comments (${comments.length})`,   Icon: MessageSquare },
          { tab: 'upvoted',  label: `Upvoted (${upvotedPosts.length})`, Icon: null },
          { tab: 'saved',    label: 'Saved',                            Icon: BookmarkIcon },
        ].map(({ tab, label }) => (
          <Link
            key={tab}
            href={`/u/${username}?tab=${tab}`}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 ease-in-out ${
              activeTab === tab
                ? 'bg-[#e6f7f0] text-[#10b981] border border-[#a7f3d0]'
                : 'text-gray-600 hover:bg-[#f8faf9] hover:text-[#111827]'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* Posts */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {userPosts.length === 0 ? (
              <div className="bg-white border border-[#eaefec] rounded-2xl p-8 text-center shadow-sm">
                <p className="text-sm text-gray-400 font-sans">No posts yet.</p>
              </div>
            ) : userPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Comments — real DB data */}
        {activeTab === 'comments' && (
          <div className="bg-white border border-[#eaefec] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Recent Comments by u/{username}
            </h3>
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 font-sans py-4 text-center">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl bg-[#f8faf9] border border-gray-200 space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <Link href={`/forum/threads/${c.thread_id}`} className="font-bold text-[#111827] hover:text-[#10b981] transition-colors">
                        {c.thread_title}
                      </Link>
                      <span>{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-xs text-[#374151] leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upvoted */}
        {activeTab === 'upvoted' && (
          <div className="space-y-4">
            {upvotedPosts.length === 0 ? (
              <div className="bg-white border border-[#eaefec] rounded-2xl p-8 text-center shadow-sm">
                <p className="text-sm text-gray-400 font-sans">No upvoted posts yet.</p>
              </div>
            ) : upvotedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Saved */}
        {activeTab === 'saved' && (
          <div className="bg-white border border-[#eaefec] rounded-2xl p-8 text-center shadow-sm">
            <p className="text-sm text-gray-400 font-sans">Saved posts coming soon.</p>
          </div>
        )}
      </div>

    </div>
  );
}
