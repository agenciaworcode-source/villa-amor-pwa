import { getSettings } from '@/app/actions/settings'
import { SettingsClient } from '@/components/dashboard/settings-client'
import { SectionHeader } from '@/components/dashboard/ui'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <div>
      <SectionHeader
        eyebrow="Sistema"
        title="Configurações"
        sub="Parâmetros gerais do sistema Villa Amor"
      />
      <SettingsClient settings={settings} />
    </div>
  )
}
