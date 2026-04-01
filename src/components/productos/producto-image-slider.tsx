'use client'

import { useCallback, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { ProductoImagen } from '@/types'
import Toast from '@/components/ui/toast'

interface ToastState {
  message: string
  type: 'success' | 'error'
}

export default function ProductoImageSlider({
  imagenes,
  productoId,
}: {
  imagenes: ProductoImagen[]
  productoId?: number
}) {
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(0)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPending, startTransition] = useTransition()
  const clearToast = useCallback(() => setToast(null), [])

  if (imagenes.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
        Sin fotos cargadas todavia
      </div>
    )
  }

  const safeActiveIndex = Math.min(activeIndex, imagenes.length - 1)
  const activeImage = imagenes[safeActiveIndex] ?? imagenes[0]
  const canDelete = typeof productoId === 'number'

  function goTo(nextIndex: number) {
    const normalized = (nextIndex + imagenes.length) % imagenes.length
    setActiveIndex(normalized)
  }

  function handleDelete() {
    if (!canDelete) return
    if (!confirm('¿Eliminar esta imagen del producto?')) return

    startTransition(async () => {
      const response = await fetch(`/api/productos/${productoId}/imagenes?imageId=${activeImage.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        setToast({ message: result.error ?? 'No se pudo eliminar la imagen.', type: 'error' })
        return
      }

      if (safeActiveIndex >= imagenes.length - 1) {
        setActiveIndex(Math.max(0, imagenes.length - 2))
      }

      setToast({ message: 'Imagen eliminada.', type: 'success' })
      router.refresh()
    })
  }

  return (
    <>
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 shadow-sm">
        <Image
          src={activeImage.url}
          alt={activeImage.alt ?? 'Foto del producto'}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover"
        />

        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="absolute left-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-200 bg-red-600 text-lg text-white shadow-lg transition hover:bg-red-700 disabled:opacity-60"
            aria-label={isPending ? 'Eliminando foto' : 'Eliminar foto'}
          >
            <span aria-hidden="true">{isPending ? '…' : '🗑️'}</span>
          </button>
        )}

        {imagenes.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(safeActiveIndex - 1)}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-lg text-white transition hover:bg-black/60"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(safeActiveIndex + 1)}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-lg text-white transition hover:bg-black/60"
              aria-label="Foto siguiente"
            >
              ›
            </button>
            <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white">
              {safeActiveIndex + 1}/{imagenes.length}
            </div>
          </>
        )}
      </div>

      {imagenes.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {imagenes.map((imagen, index) => (
            <button
              key={imagen.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative aspect-square overflow-hidden rounded-xl border transition ${
                index === safeActiveIndex ? 'border-violet-500 ring-2 ring-violet-200' : 'border-gray-200'
              }`}
              aria-label={`Ver foto ${index + 1}`}
            >
              <Image
                src={imagen.url}
                alt={imagen.alt ?? `Miniatura ${index + 1}`}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
    {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </>
  )
}
