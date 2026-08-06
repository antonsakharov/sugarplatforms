import { PRODUCT_LIMITS } from "@/lib/config";

export default function NewAssessmentPage() {
  return (
    <section className="page-shell">
      <div className="eyebrow">Assessment setup</div>
      <h1>Analyze a focused platform problem</h1>
      <p className="lede">The guided assessment form is the next feature slice. Product limits and the assessment entry route are active now.</p>
      <div className="panel">
        <h2>MVP boundaries</h2>
        <dl className="limit-grid">
          <div><dt>Primary entity</dt><dd>{PRODUCT_LIMITS.maxPrimaryEntities}</dd></div>
          <div><dt>Maximum files</dt><dd>{PRODUCT_LIMITS.maxFiles}</dd></div>
          <div><dt>Maximum file size</dt><dd>{PRODUCT_LIMITS.maxFileMegabytes} MB</dd></div>
          <div><dt>Total pages</dt><dd>{PRODUCT_LIMITS.maxTotalPages}</dd></div>
        </dl>
      </div>
    </section>
  );
}
