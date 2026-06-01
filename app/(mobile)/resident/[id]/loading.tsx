export default function ResidentLoading() {
  return (
    <div className="flex flex-col h-full bg-cream-50 animate-pulse">
      <div className="bg-white p-4 border-b border-cream-200 flex items-center gap-4">
        <div className="w-8 h-8 bg-cream-200 rounded" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 bg-cream-200 rounded w-40" />
          <div className="h-3 bg-cream-200 rounded w-24" />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-cream-100">
            <div className="h-4 bg-cream-200 rounded w-1/3 mb-3" />
            <div className="h-12 bg-cream-200 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
