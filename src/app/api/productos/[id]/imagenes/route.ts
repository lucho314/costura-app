import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { deleteProductImage, uploadProductImage } from '@/lib/r2/server'

const MAX_FILES = 6
const MAX_FILE_SIZE = 8 * 1024 * 1024

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const productId = Number.parseInt(id, 10)

  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: 'Producto invalido.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const { data: producto } = await supabase
    .from('productos')
    .select('id, nombre')
    .eq('id', productId)
    .eq('user_id', user.id)
    .single()

  if (!producto) {
    return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 })
  }

  const formData = await request.formData()
  const files = formData
    .getAll('files')
    .filter((value): value is File => value instanceof File && value.size > 0)

  if (files.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos una imagen.' }, { status: 400 })
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Solo se permiten hasta ${MAX_FILES} imagenes.` }, { status: 400 })
  }

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten archivos de imagen.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Cada imagen puede pesar hasta 8 MB.' }, { status: 400 })
    }
  }

  const { data: currentImages } = await supabase
    .from('producto_imagenes')
    .select('orden')
    .eq('producto_id', productId)
    .eq('user_id', user.id)
    .order('orden', { ascending: false })

  const initialOrder = (currentImages?.[0]?.orden ?? -1) + 1

  const uploaded = await Promise.all(files.map(async (file, index) => {
    const uploadedFile = await uploadProductImage({
      file,
      productId,
      userId: user.id,
      order: initialOrder + index,
    })

    return {
      producto_id: productId,
      user_id: user.id,
      object_key: uploadedFile.key,
      url: uploadedFile.url,
      orden: initialOrder + index,
      alt: producto.nombre,
    }
  }))

  const { error } = await supabase
    .from('producto_imagenes')
    .insert(uploaded)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/productos')
  revalidatePath(`/productos/${productId}`)

  return NextResponse.json({
    success: true,
    count: uploaded.length,
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const productId = Number.parseInt(id, 10)

  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: 'Producto invalido.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const searchParams = new URL(request.url).searchParams
  const imageId = Number.parseInt(searchParams.get('imageId') ?? '', 10)

  if (!Number.isFinite(imageId)) {
    return NextResponse.json({ error: 'Imagen invalida.' }, { status: 400 })
  }

  const { data: imagen } = await supabase
    .from('producto_imagenes')
    .select('id, object_key')
    .eq('id', imageId)
    .eq('producto_id', productId)
    .eq('user_id', user.id)
    .single()

  if (!imagen) {
    return NextResponse.json({ error: 'Imagen no encontrada.' }, { status: 404 })
  }

  try {
    await deleteProductImage(imagen.object_key)
  } catch {
    return NextResponse.json({ error: 'No se pudo borrar la imagen en R2.' }, { status: 500 })
  }

  const { error } = await supabase
    .from('producto_imagenes')
    .delete()
    .eq('id', imageId)
    .eq('producto_id', productId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/productos')
  revalidatePath(`/productos/${productId}`)

  return NextResponse.json({ success: true })
}
