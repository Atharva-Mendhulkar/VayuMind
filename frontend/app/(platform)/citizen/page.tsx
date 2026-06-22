"use client"

import { PageShell, PageSection } from "@/components/aeris/page-shell"
import { CitizenViews } from "@/components/citizen/citizen-views"

export default function CitizenPage() {
  return (
    <PageShell>
      <PageSection
        title="Citizen Intelligence"
        description="Population exposure modeling, ward-level vulnerability ranking, and personalized health advisories derived from the live AQI field."
      >
        <CitizenViews />
      </PageSection>
    </PageShell>
  )
}
