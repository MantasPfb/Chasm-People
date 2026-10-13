import { PlaceholderModule } from '@/components/ui/Primitives'

export default function PeopleAnalyticsPlaceholder() {
  return (
    <PlaceholderModule
      title="People Analytics"
      description="Deeper trend analysis across headcount, turnover, absence and capability over time."
      plannedCapabilities={[
        'Headcount and turnover trends by department and role',
        'Absence rate trends with seasonal comparison',
        'Capability coverage trends following training investment',
        'Exportable reports for site leadership reviews',
      ]}
    />
  )
}
