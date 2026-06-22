"use client"

import { PageShell, PageSection } from "@/components/aeris/page-shell"
import { AttributionViews } from "@/components/attribution/attribution-views"

export default function AttributionPage() {
  return (
    <PageShell>
      <PageSection
        title="Source Attribution"
        description="Bayesian source apportionment fusing CTM tracers, satellite fire detections, and inverse modeling to decompose PM2.5 by emission sector."
      >
        <AttributionViews />
      </PageSection>
    </PageShell>
  )
}
