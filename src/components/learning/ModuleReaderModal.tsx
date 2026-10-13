import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, CompetenceDot, Modal } from '@/components/ui/Primitives'
import { recordAssessment } from '@/hooks/useCapabilities'
import { getSopForCapability, type SopWithCapabilities } from '@/hooks/useSops'
import { CAPABILITY_CATEGORY_LABELS, type Capability } from '@/lib/types'
import type { EmployeeWithRefs } from '@/hooks/useEmployees'

export function ModuleReaderModal({
  capability,
  sops,
  employee,
  currentLevel,
  requiredLevel,
  onClose,
  onCompleted,
}: {
  capability: Capability
  sops: SopWithCapabilities[]
  employee: EmployeeWithRefs | null
  currentLevel: number | null
  requiredLevel: number | null
  onClose: () => void
  onCompleted: () => void
}) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sop = getSopForCapability(capability.id, sops)
  const alreadyAtKnowledgeLevel = currentLevel !== null && currentLevel >= 2

  async function handleComplete() {
    if (!employee) return
    setSaving(true)
    setError(null)
    try {
      await recordAssessment({
        companyId: employee.company_id,
        employeeId: employee.id,
        capabilityId: capability.id,
        assessorId: employee.id,
        levelAchieved: 2,
        notes:
          'Completed via Learning Hub e-learning module — self-assessed knowledge. Practical competence (level 3+) still requires a manager assessment.',
        source: 'learning_hub',
      })
      setJustCompleted(true)
      onCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record this completion.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={capability.name} onClose={onClose} width={620}>
      <div className="flex gap-1.5 mb-4">
        <Badge tone="accent">{CAPABILITY_CATEGORY_LABELS[capability.category]}</Badge>
        {sop && <Badge>{sop.code} · {sop.version}</Badge>}
      </div>

      {sop ? (
        <>
          <p className="text-sm leading-relaxed mb-5">{sop.summary}</p>
          <p className="text-[11px] font-bold text-accent uppercase tracking-wide mb-2">Read through the procedure</p>
          <ol className="pl-5 space-y-2 mb-5">
            {sop.steps.map((s, i) => (
              <li key={i} className="text-sm leading-relaxed">{s}</li>
            ))}
          </ol>
        </>
      ) : (
        <div className="card p-4 mb-5">
          <p className="text-sm leading-relaxed m-0">{capability.description}</p>
          <p className="text-xs text-ink-faint mt-2.5 mb-0">
            This is a developed capability rather than a procedure — full interactive training content (videos,
            knowledge checks) is planned for a future Learning Hub rollout. For now, discuss this with your manager
            alongside the description above.
          </p>
        </div>
      )}

      {employee ? (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="text-xs text-ink-faint m-0">Your status</p>
              <div className="flex items-center gap-2 mt-1">
                <CompetenceDot level={currentLevel ?? 0} />
                <span className="text-sm text-ink-muted">current{requiredLevel !== null ? ' · required ' : ''}</span>
                {requiredLevel !== null && <CompetenceDot level={requiredLevel} />}
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-critical mb-2">{error}</p>}

          {justCompleted ? (
            <Badge tone="good">Knowledge level recorded — thank you</Badge>
          ) : alreadyAtKnowledgeLevel ? (
            <p className="text-sm text-ink-muted m-0">
              You've already demonstrated this at knowledge level or above — this is a refresher read only, no new
              record needed.
            </p>
          ) : (
            <>
              <label className="flex items-start gap-2 text-sm mb-3 cursor-pointer">
                <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-0.5" />
                I confirm I have read and understood {sop ? 'this procedure' : 'this capability description'}.
              </label>
              <button disabled={!acknowledged || saving} className="btn-primary" onClick={handleComplete}>
                {saving ? 'Saving…' : 'Mark as complete (self-assessed knowledge)'}
              </button>
              <p className="text-[11px] text-ink-faint mt-2 mb-0">
                This records Level 2 — Knowledge demonstrated. Levels 3 and above (practical competence) are assessed
                by your manager.
              </p>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-faint">
          Select who you are at the top of the Learning Hub to record your own completion, or{' '}
          <Link to="/people/directory" className="text-accent hover:underline">browse the Employee Directory</Link>.
        </p>
      )}
    </Modal>
  )
}
