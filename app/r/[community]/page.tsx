import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getAllCommunities, getCommunityBySlug, getRedditPosts } from '@/lib/reddit-queries';
import RedditSidebar from '@/components/RedditSidebar';
import CommunitySidebar from '@/components/CommunitySidebar';
import PostCard from '@/components/PostCard';
import Link from 'next/link';
import { Flame, Clock, Award } from 'lucide-react';

export const revalidate = 0;

export default async function CommunityPage(props: {
  params: Promise<{ community: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { community: communitySlug } = await props.params;
  const searchParams = await props.searchParams;
  const sort = (searchParams.sort as 'hot' | 'new' | 'top') || 'hot';

  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id, 10) : undefined;

  const community = await getCommunityBySlug(communitySlug);
  if (!community) {
    notFound();
  }

  const communities = await getAllCommunities();
  const posts = await getRedditPosts({
    communitySlug,
    currentUserId: userId,
    sortBy: sort,
    limit: 50,
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Column 1: Left Navigation Sidebar */}
      <RedditSidebar communities={communities} />

      {/* Column 2: Center Post Feed */}
      <main className="flex-1 w-full min-w-0">
        {/* Community Header Card */}
        <div className="bg-white border border-[#eaefec] rounded-2xl p-5 mb-4 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#10b981] text-white font-bold flex items-center justify-center text-lg overflow-hidden shadow-xs">
              {community.icon_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={community.icon_url}
                  alt={community.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                'r/'
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#111827]">{community.name}</h1>
              <p className="text-xs text-gray-500">r/{community.slug} &bull; {community.member_count} members</p>
            </div>
          </div>

          <Link
            href="/forum/threads/new"
            className="bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-4 py-2 rounded-full transition-all shadow-sm"
          >
            + Create Post
          </Link>
        </div>

        {/* Feed Sorting Pills */}
        <div className="bg-white border border-[#eaefec] rounded-2xl p-2 mb-4 flex items-center gap-1 shadow-sm font-sans">
          <Link
            href={`/r/${communitySlug}?sort=hot`}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ease-in-out flex items-center gap-1.5 ${
              sort === 'hot'
                ? 'bg-[#e6f7f0] text-[#10b981] border border-[#10b981]/30'
                : 'text-gray-600 hover:bg-[#f8faf9]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Hot</span>
          </Link>
          <Link
            href={`/r/${communitySlug}?sort=new`}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ease-in-out flex items-center gap-1.5 ${
              sort === 'new'
                ? 'bg-[#e6f7f0] text-[#10b981] border border-[#10b981]/30'
                : 'text-gray-600 hover:bg-[#f8faf9]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>New</span>
          </Link>
          <Link
            href={`/r/${communitySlug}?sort=top`}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ease-in-out flex items-center gap-1.5 ${
              sort === 'top'
                ? 'bg-[#e6f7f0] text-[#10b981] border border-[#10b981]/30'
                : 'text-gray-600 hover:bg-[#f8faf9]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Top</span>
          </Link>
        </div>

        {/* Post Cards List */}
        {posts.length === 0 ? (
          <div className="bg-white border border-[#eaefec] rounded-2xl p-12 text-center shadow-sm">
            <p className="text-sm font-sans text-gray-500 mb-4">No posts in {community.name} yet!</p>
            <Link
              href="/forum/threads/new"
              className="inline-flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm transition-all"
            >
              Create the first post
            </Link>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </main>

      {/* Column 3: Right Community Info Sidebar */}
      <CommunitySidebar community={community} />
    </div>
  );
}
