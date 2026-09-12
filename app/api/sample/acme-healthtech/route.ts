import { NextResponse } from "next/server";
import { ActiveAssessmentLimitError } from "@/lib/assessment-repository";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { buildAcmeHealthTechSampleState, ACME_HEALTHTECH_SAMPLE_ID } from "@/lib/acme-healthtech-sample";
import { diagnosticFingerprint } from "@/lib/finding-review-persistence";
import { extractionFingerprint } from "@/lib/review-persistence";
import { generateCurrentExecutiveReport } from "@/lib/server-report-state";
import { requireServerPermission } from "@/lib/server-auth";
import { getAssessmentRepository } from "@/lib/server-assessment-store";
import { getExtractionReviewRepository } from "@/lib/server-review-store";
import { getFindingReviewRepository } from "@/lib/server-finding-review-store";
import { getProcessingRepository } from "@/lib/server-processing-store";
import { getReportRepository } from "@/lib/server-report-store";
import { scopeFromTenant } from "@/lib/tenancy";

export const runtime = "nodejs";

export async function POST() {
  try {
    const auth = requireServerPermission("assessment:create");
    const scope = scopeFromTenant(auth.tenant);
    const repositories = {
      assessment: getAssessmentRepository(),
      processing: getProcessingRepository(),
      extractionReview: getExtractionReviewRepository(),
      findingReview: getFindingReviewRepository(),
      report: getReportRepository()
    };
    const state = await buildAcmeHealthTechSampleState();
    const existing = repositories.assessment.findById(scope, ACME_HEALTHTECH_SAMPLE_ID);
    if (!existing) repositories.assessment.create(scope, state.assessment);

    repositories.processing.replace(scope, state.processing);
    repositories.extractionReview.save(
      scope,
      state.assessment.id,
      state.processing.extraction,
      state.extractionReview,
      extractionFingerprint(state.processing.extraction)
    );
    repositories.findingReview.save(
      scope,
      state.assessment.id,
      state.diagnostics,
      state.findingReview,
      diagnosticFingerprint(state.diagnostics)
    );

    let reports = repositories.report.list(scope, state.assessment.id);
    if (reports.length === 0) {
      repositories.report.save(scope, generateCurrentExecutiveReport(scope, state.assessment.id), "2026-09-12T15:08:00.000Z");
      reports = repositories.report.list(scope, state.assessment.id);
    }

    return NextResponse.json({
      assessment: state.assessment,
      stats: {
        artifactCount: state.processing.artifacts.length,
        objectCount: state.processing.extraction.stats.objectCount,
        findingCount: state.diagnostics.stats.findingCount,
        acceptedFindingCount: state.findingReview.findings.filter((item) => item.status === "accepted").length,
        reportVersionCount: reports.length
      },
      walkthrough: [
        `/assessment/${state.assessment.id}`,
        `/assessment/${state.assessment.id}/review`,
        `/assessment/${state.assessment.id}/diagnostics`,
        `/assessment/${state.assessment.id}/map`,
        `/assessment/${state.assessment.id}/maturity`,
        `/assessment/${state.assessment.id}/report`
      ]
    }, { status: existing ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof ActiveAssessmentLimitError) {
      return NextResponse.json({
        error: "This workspace already has an active assessment. Delete it from its Danger Zone before loading the Acme HealthTech sample.",
        code: "ACTIVE_ASSESSMENT_LIMIT"
      }, { status: 409 });
    }
    console.error("Acme HealthTech sample initialization failed", error);
    return NextResponse.json({ error: "The Acme HealthTech sample could not be initialized." }, { status: 500 });
  }
}
