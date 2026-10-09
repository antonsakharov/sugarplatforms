import { UploadForm } from "./upload-form";

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <section className="page-shell assessment-shell"><UploadForm assessmentId={id} /></section>;
}
