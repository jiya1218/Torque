import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Server-side file upload for onboarding documents.
 * Uses the service role key so RLS policies don't block uploads.
 * Only requires a valid auth token (no special permissions).
 */
export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, undefined, true)
  if (error) return error

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const docType = formData.get('docType') as string || 'document'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}-${docType.toLowerCase()}.${fileExt}`
    const filePath = `onboarding/${fileName}`

    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, Buffer.from(buffer), {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      })

    if (uploadError) {
      console.error('[onboarding/upload] Storage upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(filePath)

    console.log(`[onboarding/upload] Uploaded ${docType} for user ${context!.userId}: ${publicUrl}`)

    return NextResponse.json({ url: publicUrl, type: docType.toUpperCase() })
  } catch (err: any) {
    console.error('[onboarding/upload] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
