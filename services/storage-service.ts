import { supabase } from '@/utils/supabase/client'

export class StorageService {
  async uploadExecutionMedia(
    executionId: string,
    stepId: string,
    file: Blob,
    type: 'photo' | 'video'
  ): Promise<string> {
    // Determina extensão e contentType a partir do blob (suporte iOS mp4 + Android webm)
    let ext: string
    let contentType: string
    if (type === 'photo') {
      ext = 'jpg'; contentType = 'image/jpeg'
    } else if (file.type.includes('mp4')) {
      ext = 'mp4'; contentType = 'video/mp4'
    } else {
      ext = 'webm'; contentType = file.type || 'video/webm'
    }

    const fileName = `${Date.now()}.${ext}`
    const path = `executions/${executionId}/steps/${stepId}/${fileName}`

    const { error } = await supabase.storage
      .from('execution-media')
      .upload(path, file, { contentType, upsert: false })

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
