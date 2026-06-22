"use client"

import { PageShell, PageSection } from "@/components/aeris/page-shell"
import { ForecastViews } from "@/components/forecast/forecast-views"

export default function ForecastPage() {
  return (
    <PageShell>
      <PageSection
        title="Air Quality Forecasting"
        description="72-hour probabilistic PM2.5 forecasts from a spatiotemporal graph neural network, with interactive policy scenario simulation."
      >
        <ForecastViews />
      </PageSection>
    </PageShell>
  )
}
