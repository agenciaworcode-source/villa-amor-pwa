// Service Worker custom handlers — push notifications
// Este arquivo é injetado no SW gerado pelo next-pwa

/* eslint-disable no-restricted-globals */
/* global self, clients */

type PushData = {
  title?: string
  body?: string
  icon?: string
  url?: string
  tag?: string
}

// @ts-ignore — SW context
self.addEventListener('push', (event: any) => {
  const data: PushData = event.data?.json() ?? {}

  const title = data.title ?? 'Villa Amor'
  const options = {
    body:     data.body  ?? 'Você tem uma nova notificação.',
    icon:     data.icon  ?? '/icon-192.png',
    badge:    '/icon-192.png',
    tag:      data.tag   ?? 'villa-amor',
    renotify: true,
    data:     { url: data.url ?? '/dashboard' },
  }

  // @ts-ignore
  event.waitUntil(self.registration.showNotification(title, options))
})

// @ts-ignore — SW context
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? '/dashboard'

  event.waitUntil(
    // @ts-ignore
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: any[]) => {
        const existing = clientList.find((c: any) => c.url.includes(url))
        // @ts-ignore
        if (existing) return existing.focus()
        // @ts-ignore
        return self.clients.openWindow(url)
      })
  )
})
