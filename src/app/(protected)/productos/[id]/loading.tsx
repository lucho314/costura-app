function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className ?? ''}`} />
}

export default function ProductoDetalleLoading() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Skeleton className="h-4 w-32 mb-6" />

      {/* Hero card */}
      <div className="bg-gradient-to-br from-violet-400 to-indigo-400 rounded-2xl p-6 mb-6 animate-pulse">
        <Skeleton className="h-3 w-16 bg-white/30 mb-2" />
        <Skeleton className="h-7 w-48 bg-white/30 mb-4" />
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 bg-white/30" />
            <Skeleton className="h-9 w-36 bg-white/30" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-3 w-20 bg-white/30" />
            <Skeleton className="h-10 w-28 bg-white/30 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Materials table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
        <Skeleton className="h-5 w-52 mb-4" />
        <div className="space-y-3">
          <div className="flex gap-2 pb-2 border-b border-gray-100">
            {[2, 1, 1, 1.5, 1.5].map((w, i) => (
              <Skeleton key={i} className={`h-3 flex-${w === 2 ? '[2]' : w === 1.5 ? '[1.5]' : '[1]'}`} />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-2 items-center py-1">
              <Skeleton className="h-4 flex-[2]" />
              <Skeleton className="h-6 w-14 rounded-md flex-shrink-0" />
              <Skeleton className="h-4 flex-[1]" />
              <Skeleton className="h-4 flex-[1.5]" />
              <Skeleton className="h-4 flex-[1.5]" />
            </div>
          ))}
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <Skeleton className="h-5 w-44 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
          <div className="flex justify-between items-center py-2 border-b-2 border-gray-200">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="flex justify-between items-center py-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-14 w-full rounded-xl mt-2" />
        </div>
        <Skeleton className="h-3 w-44 mt-4" />
      </div>
    </div>
  )
}
