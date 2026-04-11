function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ''}`} />
}

export default function ProveedoresLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-10 w-full rounded-full" />

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
