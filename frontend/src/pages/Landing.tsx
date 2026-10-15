import { useMe } from '../lib/me'

// Public home page: the BMC's "website" channel.
export default function Landing() {
  const { me } = useMe()
  const startHref = me ? '/projects' : '/login'

  return (
    <div className="mz-page">
      <nav className="mz-nav">
        <a className="mz-brand" href="/">FlowDraft</a>
        <div className="mz-nav-links">
          <a href="#how">How it works</a>
          <a href="/pricing">Pricing</a>
          <a className="mz-secondary" href={startHref}>{me ? 'My projects' : 'Log in'}</a>
        </div>
      </nav>

      <header className="mz-section mz-hero">
        <h1>Write better, one clear step at a time.</h1>
        <p>
          A blank page is overwhelming. FlowDraft guides you from topic to finished paper, with
          structure, editing and citations in one workspace.
        </p>
        <div className="mz-hero-actions">
          <a className="mz-primary" href={startHref}>{me ? 'Open my projects' : 'Start writing free'}</a>
          <a className="mz-secondary" href="/pricing">See pricing</a>
        </div>
      </header>

      <section id="how" className="mz-section">
        <h2 className="mz-h2">From idea to finished draft</h2>
        <p className="mz-sub">One streamlined flow instead of five different tools.</p>
        <div className="mz-grid mz-steps">
          <article className="mz-card">
            <h3>Choose a topic</h3>
            <p>Pick a subject and get suggested outlines, so you never start from nothing.</p>
          </article>
          <article className="mz-card">
            <h3>Write in flow</h3>
            <p>A focused editor with formatting and a distraction-free focus mode.</p>
          </article>
          <article className="mz-card">
            <h3>Edit by structure</h3>
            <p>Reorder chapters and sentences by dragging, with full version history.</p>
          </article>
          <article className="mz-card">
            <h3>Cite and export</h3>
            <p>Add sources in APA or MLA, then export a finished DOCX or PDF.</p>
          </article>
        </div>
      </section>

      <section className="mz-section">
        <h2 className="mz-h2">Made for people who write seriously</h2>
        <p className="mz-sub">Whether the deadline is a thesis or a newsletter.</p>
        <div className="mz-grid">
          <article className="mz-card">
            <h3>Students and researchers</h3>
            <p>Structure papers, keep track of sources and learn to write with confidence.</p>
          </article>
          <article className="mz-card">
            <h3>Writers and journalists</h3>
            <p>Draft essays and articles for Medium, Substack or the newsroom, and polish every sentence.</p>
          </article>
        </div>
      </section>

      <section className="mz-section">
        <h2 className="mz-h2">Free to start</h2>
        <p className="mz-sub">
          Five drafts on the free plan. Go Pro for AI sentence variations, unlimited drafts and no ads.
        </p>
        <div className="mz-hero-actions">
          <a className="mz-primary" href={startHref}>{me ? 'Open my projects' : 'Create your free account'}</a>
          <a className="mz-secondary" href="/pricing">Compare plans</a>
        </div>
      </section>

      <footer className="mz-footer">FlowDraft</footer>
    </div>
  )
}
