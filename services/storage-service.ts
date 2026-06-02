import { createClient } from '@/utils/supabase/client'

export class StorageService {
  async uploadExecutionMedia(
    executionId: string,
    stepId: string,
    file: Blob,
    type: 'photo' | 'video'
  ): Promise<string> {
    // Determina extensão real do blob (iOS usa mp4, Android usa webm)
    let ext: string
    if (type === 'photo') {
      ext = 'jpg'
    } else if (file.type.includes('mp4')) {
      ext = 'mp4'
    } else {
      ext = 'webm'
    }

    const fileName = `${Date.now()}.${ext}`
    const path = `executions/${executionId}/steps/${stepId}/${fileName}`

    // Envia via API route server-side (service role — sem problemas de RLS/bucket)
    const formData = new FormData()
    formData.append('file', new File([file], fileName, { type: file.type || (type === 'photo' ? 'image/jpeg' : 'video/webm') }))
    formData.append('path', path)

    const res = await fetch('/api/upload-media', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('[StorageService] upload error:', body)
      throw new Error(body.error ?? 'Falha ao enviar arquivo.')
    }

    return path
  }

  async getSignedUrl(path: string): Promise<string> {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('execution-media')
      .createSignedUrl(path, 3600)

    if (error) throw new Error('Falha ao gerar link de visualização.')
    return data.signedUrl
  }
}

export const storageService = new StorageService()
