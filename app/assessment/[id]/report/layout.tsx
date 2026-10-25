import type { ReactNode } from "react";
import "./report-print.css";

export default function ReportLayout({ children }: { children: ReactNode }) {
  return <div className="report-route">{children}</div>;
}
