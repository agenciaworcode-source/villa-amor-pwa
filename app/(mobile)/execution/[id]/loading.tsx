export default function ExecutionLoading() {
  return (
    <div className="flex flex-col h-full bg-cream-50 animate-pulse">
      <div className="bg-white p-4 border-b border-cream-200 flex items-center gap-4">
        <div className="w-8 h-8 bg-cream-200 rounded" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 bg-cream-200 rounded w-40" />
          <div className="h-3 bg-cream-200 rounded w-24" />
        </div>
      </div>

      {/* Progress bar skeleton */}
      <div className="bg-white px-4 py-3 border-b border-cream-100 flex gap-1.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-1.5 flex-1 bg-cream-200 rounded-full" />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        <div className="space-y-3 w-full max-w-sm text-center">
          <div className="h-6 bg-cream-200 rounded-full w-32 mx-auto" />
          <div className="h-8 bg-cream-200 rounded w-3/4 mx-auto" />
        </div>
        <div className="w-full max-w-sm aspect-square bg-cream-200 rounded-[40px]" />
      </div>

      <div className="p-6 bg-white border-t border-cream-200">
        <div className="h-[58px] bg-cream-200 rounded-2xl w-full" />
      </div>
    </div>
  )
}
