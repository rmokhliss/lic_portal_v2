// LIC v2 — /files (stub PhaseStub stylé DS).

import { PhaseStub } from "@/components/shared/PhaseStub";

export default function FilesPage() {
  return (
    <div className="p-8">
      <PhaseStub
        phase={null}
        label="Fichiers"
        description="Journalisation des fichiers .lic générés et healthchecks importés."
      />
    </div>
  );
}
