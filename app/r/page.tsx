import { auth } from '@/auth';
import { getAllCommunities, getRedditPosts } from '@/lib/reddit-queries';
import RedditSidebar from '@/components/RedditSidebar';
import CommunitySidebar from '@/components/CommunitySidebar';
import Link from 'next/link';
import { Flame, Clock, Award, TrendingUp, Grid } from 'lucide-react';
import FeedWithViewToggle from '@/components/FeedWithViewToggle';

export const revalidate = 0;

export default async function RedditHomePage(props: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id, 10) : undefined;
  const searchParams = await props.searchParams;
  const sort = (searchParams.sort as 'hot' | 'new' | 'top' | 'rising' | 'tierlists') || 'hot';

  const communities = await getAllCommunities();
  const posts = await getRedditPosts({
    communitySlug: 'all',
    currentUserId: userId,
    sortBy: sort === 'tierlists' ? 'top' : (sort as 'hot' | 'new' | 'top'),
    limit: 50,
  });

  const defaultCommunity = communities[0] || {
    id: 1,
    name: 'r/audiophile',
    slug: 'audiophile',
    description: 'A community dedicated to high-end audio, IEMs, DACs, and sound science.',
    banner_url: null,
    icon_url: null,
    member_count: 3200000,
  };

  const SORT_LINKS = [
    { href: '/r?sort=hot',      label: 'Hot',       icon: Flame,      key: 'hot' },
    { href: '/r?sort=new',      label: 'New',        icon: Clock,      key: 'new' },
    { href: '/r?sort=top',      label: 'Top',        icon: Award,      key: 'top' },
    { href: '/r?sort=rising',   label: 'Rising',     icon: TrendingUp, key: 'rising' },
    { href: '/tier-lists',      label: 'Tier Lists', icon: Grid,       key: 'tierlists' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start font-sans">
      {/* Column 1: Left Navigation Sidebar */}
      <RedditSidebar communities={communities} />

      {/* Column 2: Center Post Feed */}
      <main className="flex-1 w-full min-w-0 space-y-4">
        {/* Filter Pills Bar */}
        <div className="bg-white border border-[#eaefec] rounded-2xl p-2 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {SORT_LINKS.map(({ href, label, icon: Icon, key }) => (
              <Link
                key={key}
                href={href}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ease-in-out flex items-center gap-1.5 whitespace-nowrap ${
                  sort === key
                    ? 'bg-[#e6f7f0] text-[#10b981] border border-[#10b981]/30'
                    : 'text-gray-600 hover:bg-[#f8faf9] hover:text-[#111827]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Post Cards with functional view toggle (Cards / Compact) */}
        {posts.length === 0 ? (
          <div className="bg-white border border-[#eaefec] rounded-2xl p-12 text-center shadow-sm">
            <p className="text-sm font-sans text-gray-500 mb-4">No community posts yet!</p>
            <Link
              href="/forum/threads/new"
              className="inline-flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm transition-all"
            >
              Be the first to post
            </Link>
          </div>
        ) : (
          <FeedWithViewToggle posts={posts} />
        )}
      </main>

      {/* Column 3: Right Community Info & Daily Stats Sidebar */}
      <CommunitySidebar community={defaultCommunity} />
    </div>
  );
}
