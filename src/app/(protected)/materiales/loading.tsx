function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className ?? ''}`} />
}

export default function MaterialesLoading() {
  return (
    <div>
      {/* Search bar */}
      <Skeleton className="h-10 w-full rounded-full mb-6" />

      {/* Cards */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            {/* Color circle */}
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            {/* Text lines */}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            {/* Action icons */}
            <div className="flex gap-2 flex-shrink-0">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
