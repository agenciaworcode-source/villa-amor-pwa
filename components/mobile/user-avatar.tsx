'use client'

import { useAuthStore } from '@/store/auth-store'
import Link from 'next/link'

export function UserAvatar() {
  const { user } = useAuthStore()
  const name: string = user?.user_metadata?.name ?? user?.email ?? ''
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || '?'

  return (
    <Link href="/profile" className="w-8 h-8 rounded-full bg-gold-200 flex items-center justify-center text-gold-600 font-bold text-xs hover:bg-gold-300 transition-colors">
      {initials}
    </Link>
  )
}
