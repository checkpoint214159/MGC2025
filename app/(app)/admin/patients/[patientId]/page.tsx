import { PatientDetailView } from "@/components/admin/PatientDetailView";

export default function Page({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = React.use(params);
  return <PatientDetailView patientId={patientId} />;
}

import React from "react";

