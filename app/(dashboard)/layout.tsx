import { SidebarNav } from '@/components/dashboard/sidebar-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-cream-50">
      <SidebarNav />
      <main style={{ marginLeft: 224, flex: 1, padding: 40, maxWidth: 'calc(100vw - 224px)', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}
