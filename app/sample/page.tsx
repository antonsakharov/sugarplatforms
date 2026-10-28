import { SampleLauncher } from "./sample-launcher";

const walkthrough = [
  ["01", "Assessment", "See the focused Patient identity scope and business concern."],
  ["02", "Evidence & extraction", "Inspect four bounded architecture artifacts and the extracted systems, entities, identifiers, integrations, capabilities, and owners."],
  ["03", "Reviewed findings", "See deterministic findings for fragmented IDs, competing authority, duplicated logic/capabilities, and integration risk."],
  ["04", "Entity/ID map", "Explore the same evidence-backed graph used by uploaded assessments."],
  ["05", "Maturity & recommendations", "Review the focused maturity signal and prioritized remediation sequence."],
  ["06", "Executive report", "Open the pre-generated immutable report version and formal export path."]
] as const;

export default function SamplePage() {
  return (
    <section className="page-shell">
      <div className="eyebrow">Acme HealthTech · guided demo</div>
      <h1>Patient identity & platform diagnostic</h1>
      <p className="lede">Launch a preloaded assessment that runs through the same server-backed extraction, review, diagnostics, Entity/ID map, maturity, recommendations, and executive-report surfaces as a real customer assessment.</p>
      <div className="metrics">
        <article><strong>4</strong><span>Architecture artifacts</span></article>
        <article><strong>1</strong><span>Primary entity</span></article>
        <article><strong>7</strong><span>Diagnostic rules</span></article>
        <article><strong>1</strong><span>Saved report version</span></article>
      </div>
      <div className="panel">
        <h2>What the sample demonstrates</h2>
        <p>The fixture is architecture metadata only. It contains no patient records, credentials, secrets, regulated data, or live production access. All sample findings still require direct evidence from the fixture artifacts.</p>
        <SampleLauncher />
      </div>
      <div className="workspace-grid">
        {walkthrough.map(([number, title, description]) => <article className="card" key={number}><span className="card-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}
      </div>
    </section>
  );
}
