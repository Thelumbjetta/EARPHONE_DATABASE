import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getAllCommunities, getCommunityBySlug, getRedditPostById } from '@/lib/reddit-queries';
import { getCommentsByThread } from '@/lib/forum-queries';
import RedditSidebar from '@/components/RedditSidebar';
import CommunitySidebar from '@/components/CommunitySidebar';
import PostCard from '@/components/PostCard';
import ThreadReplyForm from '@/components/ThreadReplyForm';
import ImageWithLightbox from '@/components/ImageWithLightbox';

export const revalidate = 0;

export default async function RedditThreadPage(props: {
  params: Promise<{ community: string; id: string }>;
}) {
  const { community: communitySlug, id } = await props.params;
  const threadId = parseInt(id, 10);

  if (isNaN(threadId)) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id, 10) : undefined;

  const community = await getCommunityBySlug(communitySlug);
  if (!community) {
    notFound();
  }

  const post = await getRedditPostById(threadId, userId);
  if (!post) {
    notFound();
  }

  const commentsResult = await getCommentsByThread(threadId, 1, 100);
  const comments = commentsResult.data || [];
  const communities = await getAllCommunities();

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start font-sans">
      {/* Column 1: Left Navigation Sidebar */}
      <RedditSidebar communities={communities} />

      {/* Column 2: Center Post & Comment Section */}
      <main className="flex-1 w-full min-w-0 space-y-4">
        {/* Full Reddit Post Card */}
        <PostCard post={post} />

        {/* Reply Submission Form */}
        <div className="bg-white border border-[#eaefec] rounded-2xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#111827] mb-4 flex items-center gap-2 font-sans">
            <span>💬</span> Join the discussion
          </h3>
          <ThreadReplyForm threadId={threadId} />
        </div>

        {/* Comments Section */}
        <div className="bg-white border border-[#eaefec] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#111827] font-sans pb-3 border-b border-[#eaefec]">
            Comments ({comments.length})
          </h3>

          {comments.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 font-sans">
              No comments yet. Be the first to reply!
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl border border-gray-200 bg-[#f8faf9] p-4 space-y-2.5 transition-all duration-200 ease-in-out"
                >
                  <div className="flex items-center justify-between text-xs text-gray-400 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#111827]">u/{comment.author_username}</span>
                      <span>&bull;</span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#374151] whitespace-pre-wrap leading-relaxed font-sans">
                    {comment.content}
                  </p>

                  {comment.media_url && (
                    <div className="mt-2">
                      <ImageWithLightbox
                        src={comment.media_url}
                        alt="Comment attachment"
                        caption="Click to view full image"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Column 3: Right Community Info Sidebar */}
      <CommunitySidebar community={community} />
    </div>
  );
}
