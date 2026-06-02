'use client'

import { useRef, useState, useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'

interface CameraProps {
  onCapture: (blob: Blob) => void
  onClose: () => void
  type: 'photo' | 'video'
}

export const CameraModal = ({ onCapture, onClose, type }: CameraProps) => {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const [stream, setStream]           = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [maxVideoSec, setMaxVideoSec] = useState(30)
  const [allowGallery, setAllowGallery] = useState(false)
  const [countdown, setCountdown]     = useState<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const mimeTypeRef      = useRef<string>('')
  const countdownRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const { toast } = useUIStore()

  // Carrega configurações de câmera do banco
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(cfg => {
        if (!cfg) return
        setMaxVideoSec(Number(cfg.camera_max_video_seconds) || 30)
        setAllowGallery(cfg.camera_allow_gallery === 'true')
      })
      .catch(() => {})
  }, [])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: type === 'video',
      })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setStream(mediaStream)
    } catch (err) {
      console.error('Erro ao acessar câmera:', err)
      toast('Não foi possível acessar a câmera. Verifique as permissões.', 'error')
      onClose()
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(videoRef.current, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          onCapture(blob)
          stopCamera()
        }
      }, 'image/jpeg', 0.8)
    }
  }

  const startRecording = () => {
    if (stream) {
      chunksRef.current = []

      // Detecta MIME type suportado pelo browser (iOS Safari usa mp4, Android usa webm)
      const candidates = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      const mimeType = candidates.find(t => {
        try { return MediaRecorder.isTypeSupported(t) } catch { return false }
      }) ?? ''
      mimeTypeRef.current = mimeType

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'video/webm' })
        onCapture(blob)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setCountdown(maxVideoSec)

      // Countdown visual
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            return null
          }
          return prev - 1
        })
      }, 1000)

      // Limite configurável
      setTimeout(() => {
        if (recorder.state === 'recording') stopRecording()
      }, maxVideoSec * 1000)
    }
  }

  const stopRecording = () => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCountdown(null)
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    stopCamera()
  }

  // Inicializa a câmera ao montar
  useEffect(() => {
    startCamera()
    return () => { stopCamera() }
  }, [])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Overlay de Guia */}
        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
            <div className="w-full h-full border-2 border-white/20 rounded-3xl" />
        </div>

        {type === 'video' && isRecording && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-600 px-4 py-1.5 rounded-full text-white text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            GRAVANDO {countdown !== null && <span className="font-mono">{countdown}s</span>}
          </div>
        )}
      </div>

      <div className="p-8 bg-black flex items-center justify-between">
        <button onClick={() => { stopCamera(); onClose() }} className="text-white text-sm font-bold">
          CANCELAR
        </button>

        {type === 'photo' ? (
          <button 
            onClick={capturePhoto}
            className="w-20 h-20 bg-white rounded-full border-8 border-white/20 active:scale-90 transition-all"
          />
        ) : (
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full border-8 border-white/20 active:scale-90 transition-all ${isRecording ? 'bg-red-600' : 'bg-white'}`}
          />
        )}

        {/* Galeria — só aparece se habilitado nas configurações */}
        {allowGallery && type === 'photo' ? (
          <label className="w-16 flex flex-col items-center gap-1 cursor-pointer">
            <span className="text-white text-xs font-bold">GALERIA</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) { stopCamera(); onCapture(file) }
              }}
            />
          </label>
        ) : (
          <div className="w-16" />
        )}
      </div>
    </div>
  )
}
