// LIC v2 — /volumes (stub PhaseStub stylé DS).
// Vue cross-licences des volumes article ; vrai écran (EC-04 par licence)
// reste accessible via /licences/[id]/articles.

import { PhaseStub } from "@/components/shared/PhaseStub";

export default function VolumesPage() {
  return (
    <div className="p-8">
      <PhaseStub
        phase={null}
        label="Articles & Volumes"
        description="Suivi des volumes consommés par article et par licence."
      />
    </div>
  );
}
