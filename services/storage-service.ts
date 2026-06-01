import { supabase } from '@/utils/supabase/client'

export class StorageService {
  async uploadExecutionMedia(
    executionId: string,
    stepId: string,
    file: Blob,
    type: 'photo' | 'video'
  ): Promise<string> {
    const ext = type === 'photo' ? 'jpg' : 'webm'
    const fileName = `${Date.now()}.${ext}`
    const path = `executions/${executionId}/steps/${stepId}/${fileName}`

    const { error } = await supabase.storage
      .from('execution-media')
      .upload(path, file, {
        contentType: type === 'photo' ? 'image/jpeg' : 'video/webm',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      throw new Error('Falha ao enviar arquivo para o servidor.')
    }

    return path
  }

  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('execution-media')
      .createSignedUrl(path, 3600)
    
    if (error) throw new Error('Falha ao gerar link de visualização.')
    return data.signedUrl
  }
}

export const storageService = new StorageService()
