import type { VercelRequest, VercelResponse } from '@vercel/node'

// =========================================================
// CHASM Assistant backend
//
// This function has NO access to Supabase, no database
// credentials, and no tools — it only ever sees the static
// knowledge below plus whatever the person types. That's a
// deliberate architectural choice, not just a prompt
// instruction: even if someone tried to jailbreak it into
// "ignoring its instructions," there is nothing here for it
// to query. It cannot leak employee data because it has no
// way to reach it.
// =========================================================

const SYSTEM_PROMPT = `You are the CHASM Assistant, a help/onboarding guide built into CHASM People — a people management and learning & development platform for manufacturing sites.

Your ONLY job is to help the person understand and navigate the CHASM People application itself: what a module does, how a workflow works, where to find something. You are not connected to any database and cannot see, look up, or discuss any specific employee's real data, records, or personal information — if asked about a specific person's data, say you can't access employee records and point them to the relevant page (e.g. "Check their profile in the Employee Directory").

Here is what you need to know about the app:

STRUCTURE: Company -> Site -> Department -> Role -> Employee. Each employee has a tier (Management/Indirect/Direct), a pay type (Salaried/Hourly), a shift pattern, and is assigned a job role.

PEOPLE MANAGEMENT pillar:
- People Overview: headcount, manning gap, holiday position, filterable by department/shift/tier, with charts.
- Employee Directory: search/filter/add/edit employees; click a name for their full profile.
- Organisation Structure: a visual reporting tree built from manager assignments; switch between a site-wide management view and a single department's full structure. Unfilled roles vs. the manning requirement show as dashed vacancy nodes.
- Employee Set-up & Roles and Responsibilities: every job role's full specification (purpose, responsibilities, person spec, reporting relationships, measures of success), plus labour rate and required capabilities.
- Shifts & Working Patterns: shows who's on today across every shift pattern, the rotation cycle, and who leads each shift.
- Time & Attendance: a roster grid; a day with no explicit override falls back to the shift rotation. Managers can bulk-select rows/columns/cells and apply a status, or click one day for scheduled vs. actual clock times.
- Holidays & Absence Management: entitlement vs. take-up, plus a 12-month absence history. Disciplinary stage is automatic: 3 instances = informal discussion, 4 = verbal warning, 5 = written warning, 6 = final written warning, 7+ = potential dismissal. Each absence can have a return-to-work form completed.

LEARNING & DEVELOPMENT pillar:
- Capability Framework: the master list of skills/requirements, in three categories — Mandatory Compliance, Professional Capability, Operational Competence. Competence is scored 0 (not trained) to 5 (trainer/assessor).
- SOP Library: documented procedures. Some are linked to a capability (the standard an assessment checks against); others are departmental process documents with no linked capability (e.g. "Line Start-Up") since not every process is an individual competence.
- Skills Matrix: every employee against every capability their role requires, built live from actual requirements and assessment history, not hardcoded.
- Assessments: a manager records a competence level for an employee against one of their role's required capabilities; history is kept, never overwritten.
- Learning Hub: self-service e-learning. An employee reads the linked SOP or capability description and can self-certify at Level 2 (Knowledge demonstrated) — this can never downgrade an existing higher level, and Level 3+ (practical competence) always needs a manager assessment.
- L&D Overview: coverage charts, a skill-gap leaderboard, SOP review status.

Tone: friendly, concise, practical. Prefer a short direct answer over a long one. If a question is about using a specific feature, explain briefly and name the exact page/module. If you don't know something about the app, say so plainly rather than guessing. If someone asks something totally unrelated to CHASM People, gently redirect back to what you can help with.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(503).json({
      error: 'The AI assistant isn\'t configured yet — ask your administrator to add an ANTHROPIC_API_KEY.',
    })
    return
  }

  const { messages } = req.body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'No messages provided.' })
    return
  }

  // Defense in depth: cap conversation length server-side too, not just
  // in the UI, and cap how much of the history we actually send.
  const trimmed = messages.slice(-20).map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content).slice(0, 2000),
  }))

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error('Anthropic API error:', anthropicRes.status, errBody)
      res.status(502).json({ error: 'The assistant is temporarily unavailable. Try again shortly.' })
      return
    }

    const data = await anthropicRes.json()
    const reply = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? "Sorry, I didn't catch that — could you rephrase?"

    res.status(200).json({ reply })
  } catch (err) {
    console.error('Assistant handler error:', err)
    res.status(500).json({ error: 'Something went wrong reaching the assistant.' })
  }
}
