const outcomes = [
  "Map systems, entities, and identifiers",
  "Expose conflicting source-of-truth claims",
  "Find duplicated capabilities and brittle integrations",
  "Generate evidence-backed recommendations"
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">Limited platform diagnostic</div>
        <h1>Turn architecture artifacts into an actionable platform assessment.</h1>
        <p className="hero-copy">Upload a focused set of system inventories, API contracts, schemas, and architecture documents. Sugar extracts the platform model, links every finding to evidence, and creates a modernization plan.</p>
        <div className="actions">
          <a className="button" href="/assessment/new">Analyze my platform</a>
          <a className="button button-secondary" href="/sample">View sample diagnostic</a>
        </div>
        <p className="limit-note">One focus area · One primary entity · Up to 10 files · 150 pages total</p>
      </section>
      <section className="content-section">
        <div className="eyebrow">What the CTO receives</div>
        <h2>A diagnostic, not another document search tool.</h2>
        <div className="card-grid">
          {outcomes.map((outcome, index) => (
            <article className="card" key={outcome}>
              <span>0{index + 1}</span><h3>{outcome}</h3>
              <p>Structured, reviewable, and traceable to the exact source artifact.</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
