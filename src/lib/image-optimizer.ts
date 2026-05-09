const OPTIMIZABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_SIDE = 1600
const WEBP_QUALITY = 1

export async function optimizeImageForUpload(file: File) {
  if (!OPTIMIZABLE_TYPES.has(file.type)) {
    return file
  }

  try {
    const image = await loadImage(file)
    const { width, height } = getTargetSize(image.width, image.height)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(image, 0, 0, width, height)
    const blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)

    URL.revokeObjectURL(image.src)

    if (!blob || blob.size >= file.size) {
      return file
    }

    return new File([blob], replaceExtension(file.name, 'webp'), {
      type: 'image/webp',
      lastModified: file.lastModified,
    })
  } catch {
    return file
  }
}

export async function optimizeImagesForUpload(files: File[]) {
  return Promise.all(files.map(file => optimizeImageForUpload(file)))
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo cargar la imagen.'))
    }
    image.src = url
  })
}

function getTargetSize(width: number, height: number) {
  const longestSide = Math.max(width, height)

  if (longestSide <= MAX_IMAGE_SIDE) {
    return { width, height }
  }

  const ratio = MAX_IMAGE_SIDE / longestSide

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, type, quality)
  })
}

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'imagen'
  return `${baseName}.${extension}`
}
