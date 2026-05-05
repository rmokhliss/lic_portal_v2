// LIC v2 — /alerts (stub PhaseStub stylé DS).

import { PhaseStub } from "@/components/shared/PhaseStub";

export default function AlertsPage() {
  return (
    <div className="p-8">
      <PhaseStub
        phase={null}
        label="Alertes"
        description="Configuration et historique des alertes de seuil."
      />
    </div>
  );
}
