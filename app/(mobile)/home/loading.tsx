export default function HomeLoading() {
  return (
    <div className="flex flex-col h-full bg-cream-50 animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white p-5 border-b border-cream-200">
        <div className="h-4 bg-cream-200 rounded w-32 mb-2" />
        <div className="h-7 bg-cream-200 rounded w-48" />
      </div>

      {/* Cards skeleton */}
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-cream-100 space-y-3">
            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 bg-cream-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-cream-200 rounded w-3/4" />
                <div className="h-3 bg-cream-200 rounded w-1/2" />
              </div>
            </div>
            <div className="h-10 bg-cream-200 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
