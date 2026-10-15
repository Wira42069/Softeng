import type { Plan } from '../lib/me'

interface AdSlotProps {
  plan: Plan | undefined
  variant?: 'banner' | 'compact'
}

// Ad placement for the Free plan (the BMC says Free is ad-supported and Pro has no ads).
// It renders nothing for Pro users, and nothing while the plan is still loading.
//
// This is a house ad promoting Pro. To show a real ad network instead, replace the body
// of this component with the network's snippet; keep the `plan === 'free'` check.
export default function AdSlot({ plan, variant = 'banner' }: AdSlotProps) {
  if (plan !== 'free') return null

  return (
    <aside className={`mz-ad mz-ad-${variant}`} aria-label="Advertisement">
      <span className="mz-ad-label">Ad</span>
      <div className="mz-ad-copy">
        <strong>Write without limits.</strong>
        <span> AI sentence variations, unlimited drafts and no ads with FlowDraft Pro.</span>
      </div>
      <a className="mz-ad-cta" href="/pricing">See Pro</a>
    </aside>
  )
}
