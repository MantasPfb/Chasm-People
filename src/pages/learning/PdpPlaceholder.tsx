import { PlaceholderModule } from '@/components/ui/Primitives'

export default function PdpPlaceholder() {
  return (
    <PlaceholderModule
      title="Personal Development Plans"
      description="Turn identified capability gaps into prioritised, trackable development plans per employee."
      plannedCapabilities={[
        'Auto-populate a draft plan from each employee\'s current capability gaps',
        'Set priorities, target dates and owners for each development action',
        'Track progress against the plan over time',
        'Summarise development activity across a department or team',
      ]}
    />
  )
}
