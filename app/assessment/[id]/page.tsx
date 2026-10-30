import { AssessmentWorkspace } from "./assessment-workspace";

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <section className="page-shell"><AssessmentWorkspace id={id} /></section>;
}
