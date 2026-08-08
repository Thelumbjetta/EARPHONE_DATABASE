export default function FeedSkeleton() {
  return (
    <div className="space-y-4 w-full">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white border border-[#eaefec] rounded-2xl overflow-hidden shadow-sm flex animate-pulse"
        >
          {/* Vote Column Skeleton */}
          <div className="bg-[#f8faf9] w-12 sm:w-14 border-r border-[#eaefec] py-4 px-2 flex flex-col items-center justify-start gap-2 flex-shrink-0">
            <div className="w-6 h-6 rounded-md bg-gray-200" />
            <div className="w-7 h-3 rounded bg-gray-200" />
            <div className="w-6 h-6 rounded-md bg-gray-200" />
          </div>

          {/* Content Area Skeleton */}
          <div className="flex-1 p-4 sm:p-5 space-y-3">
            {/* Metadata Line Skeleton */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-3 rounded bg-gray-200" />
              <div className="w-2 h-2 rounded-full bg-gray-200" />
              <div className="w-24 h-3 rounded bg-gray-200" />
              <div className="w-2 h-2 rounded-full bg-gray-200" />
              <div className="w-12 h-3 rounded bg-gray-200" />
            </div>

            {/* Title Skeleton */}
            <div className="space-y-1.5 pt-1">
              <div className="w-11/12 h-4 rounded bg-gray-200" />
              <div className="w-3/4 h-4 rounded bg-gray-200" />
            </div>

            {/* Body Snippet Skeleton */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full h-3 rounded bg-gray-100" />
              <div className="w-5/6 h-3 rounded bg-gray-100" />
            </div>

            {/* Action Buttons Skeleton */}
            <div className="flex items-center gap-2 pt-2">
              <div className="w-24 h-7 rounded-full bg-gray-200" />
              <div className="w-16 h-7 rounded-full bg-gray-200" />
              <div className="w-16 h-7 rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
