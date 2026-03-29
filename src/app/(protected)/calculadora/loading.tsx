function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className ?? ''}`} />
}

export default function CalculadoraLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="space-y-5">
        {/* Nombre del producto */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* Materiales */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Skeleton className="h-10 flex-1 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
              <Skeleton className="h-10 w-20 rounded-xl" />
              <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
            </div>
          ))}
          <div className="flex justify-end">
            <Skeleton className="h-4 w-44" />
          </div>
        </div>

        {/* Mano de obra */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-28" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
          <Skeleton className="h-10 rounded-xl" />
        </div>

        {/* Gastos generales */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* Margen */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>

        {/* Result card */}
        <div className="bg-white rounded-2xl border-l-4 border-violet-300 shadow-sm p-5 space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-24 rounded-full" />
        </div>

        {/* CTA button */}
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  )
}
