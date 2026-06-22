"use client"

import { PageShell, PageSection } from "@/components/aeris/page-shell"
import { EnforcementViews } from "@/components/enforcement/enforcement-views"

export default function EnforcementPage() {
  return (
    <PageShell>
      <PageSection
        title="Enforcement Intelligence"
        description="AI-ranked enforcement queue optimizing field-unit deployment by projected AQI relief (ROI), violation history, and model confidence."
      >
        <EnforcementViews />
      </PageSection>
    </PageShell>
  )
}
