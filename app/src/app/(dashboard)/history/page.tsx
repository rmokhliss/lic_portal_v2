// LIC v2 — /history (stub PhaseStub stylé DS).

import { PhaseStub } from "@/components/shared/PhaseStub";

export default function HistoryPage() {
  return (
    <div className="p-8">
      <PhaseStub
        phase={null}
        label="Journal"
        description="Journal global des modifications (toutes entités)."
      />
    </div>
  );
}
