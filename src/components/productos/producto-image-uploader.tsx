'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { optimizeImagesForUpload } from '@/lib/image-optimizer'
import Toast from '@/components/ui/toast'

interface ToastState {
  message: string
  type: 'success' | 'error'
}

const MAX_FILES = 6

export default function ProductoImageUploader({
  productoId,
  existingCount,
}: {
  productoId: number
  existingCount: number
}) {
  const router = useRouter()
  const [fotos, setFotos] = useState<File[]>([])
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPending, startTransition] = useTransition()

  const remainingSlots = Math.max(0, MAX_FILES - existingCount)

  function handlePhotoSelection(fileList: FileList | null) {
    if (!fileList || remainingSlots === 0) return

    setError('')
    const selected = Array.from(fileList).filter(file => file.type.startsWith('image/'))

    setFotos(prev => {
      const existingKeys = new Set(prev.map(file => `${file.name}-${file.size}-${file.lastModified}`))
      const next = [...prev]
      const allowedTotal = Math.max(0, MAX_FILES - existingCount)

      for (const file of selected) {
        const key = `${file.name}-${file.size}-${file.lastModified}`
        if (existingKeys.has(key)) continue
        if (next.length >= allowedTotal) break

        existingKeys.add(key)
        next.push(file)
      }

      if (selected.length > 0 && next.length === allowedTotal && prev.length + selected.length > allowedTotal) {
        setError(`Solo podes tener hasta ${MAX_FILES} imagenes por producto.`)
      }

      return next
    })

    setPhotoInputKey(prev => prev + 1)
  }

  function removePhoto(index: number) {
    setFotos(prev => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  function uploadPhotos() {
    if (fotos.length === 0) {
      setError('Selecciona al menos una imagen.')
      return
    }

    setError('')

    startTransition(async () => {
      const formData = new FormData()
      const optimizedFotos = await optimizeImagesForUpload(fotos)

      optimizedFotos.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch(`/api/productos/${productoId}/imagenes`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error ?? 'No se pudieron subir las imagenes.')
        return
      }

      setFotos([])
      setPhotoInputKey(prev => prev + 1)
      setToast({
        message: `${result.count} foto${result.count !== 1 ? 's' : ''} agregada${result.count !== 1 ? 's' : ''}.`,
        type: 'success',
      })
      router.refresh()
    })
  }

  const clearToast = useCallback(() => setToast(null), [])

  return (
    <>
      <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">Agregar mas fotos</h3>
            <p className="text-sm text-gray-500">
              {remainingSlots > 0
                ? `Podes sumar hasta ${remainingSlots} foto${remainingSlots !== 1 ? 's' : ''} mas.`
                : 'Ya alcanzaste el maximo de 6 fotos por producto.'}
            </p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-violet-700">
            {existingCount + fotos.length}/{MAX_FILES}
          </span>
        </div>

        <input
          key={photoInputKey}
          type="file"
          accept="image/*"
          multiple
          disabled={remainingSlots === 0 || isPending}
          onChange={e => handlePhotoSelection(e.target.files)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-violet-700 hover:file:bg-violet-100 disabled:opacity-60"
        />

        {fotos.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {fotos.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="shrink-0 text-xs font-semibold text-red-500 transition hover:text-red-700"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={isPending || fotos.length === 0}
            onClick={uploadPhotos}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
          >
            {isPending ? 'Subiendo...' : 'Subir fotos'}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </>
  )
}
