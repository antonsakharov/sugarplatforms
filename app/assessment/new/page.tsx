import { PRODUCT_LIMITS } from "@/lib/config";
import { AssessmentForm } from "./assessment-form";

export default function NewAssessmentPage() {
  return (
    <section className="page-shell assessment-shell">
      <div className="eyebrow">Assessment setup</div>
      <h1>Analyze a focused platform problem</h1>
      <p className="lede">Define one platform question and one primary business entity. Sugar keeps the diagnostic intentionally narrow so every finding can be traced to evidence.</p>
      <div className="panel limits-panel">
        <h2>Assessment boundaries</h2>
        <dl className="limit-grid">
          <div><dt>Primary entity</dt><dd>{PRODUCT_LIMITS.maxPrimaryEntities}</dd></div>
          <div><dt>Maximum files</dt><dd>{PRODUCT_LIMITS.maxFiles}</dd></div>
          <div><dt>Maximum file size</dt><dd>{PRODUCT_LIMITS.maxFileMegabytes} MB</dd></div>
          <div><dt>Total pages</dt><dd>{PRODUCT_LIMITS.maxTotalPages}</dd></div>
        </dl>
      </div>
      <AssessmentForm />
    </section>
  );
}
