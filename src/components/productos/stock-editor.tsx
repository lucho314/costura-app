'use client'

import { useState, useTransition } from 'react'
import { updateStock } from '@/lib/actions/productos'

export default function StockEditor({
  productoId,
  initialStock,
}: {
  productoId: number
  initialStock: number
}) {
  const [stock, setStock] = useState(initialStock)
  const [isPending, startTransition] = useTransition()

  function change(delta: number) {
    const next = Math.max(0, stock + delta)
    setStock(next)
    startTransition(async () => {
      await updateStock(productoId, next)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => change(-1)}
        disabled={stock === 0 || isPending}
        className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-lg transition-all disabled:opacity-40"
      >
        −
      </button>
      <span className="text-2xl font-extrabold min-w-8 text-center">{stock}</span>
      <button
        onClick={() => change(1)}
        disabled={isPending}
        className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-lg transition-all"
      >
        +
      </button>
    </div>
  )
}
