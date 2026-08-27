import { ExtractionReviewClient } from "./review-client";

export default async function ExtractionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="page-shell"><ExtractionReviewClient assessmentId={id} /></main>;
}
