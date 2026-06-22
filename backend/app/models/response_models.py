"""Response models for VayuMind API"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


# ============================================================================
# COMMAND CENTER MODELS
# ============================================================================

class DashboardMetric(BaseModel):
    """Dashboard overview metrics"""
    city_aqi: int
    city_pm25: int
    city_pm10: int
    trend: str = Field(..., description="rising, stable, falling")
    critical_hotspots: int
    active_alerts: int
    stations_online: int
    stations_total: int


class GridCell(BaseModel):
    """Individual grid cell data"""
    id: str
    lat: float
    lng: float
    aqi: int
    pm25: int
    pm10: int
    no2: int
    residual: float = Field(default=0.0, description="PINN residual")
    confidence: float = Field(..., description="Model confidence 0-1")


class CellInspector(BaseModel):
    """Detailed cell inspection data"""
    pm25: int
    pm10: int
    no2: int
    aqi: int
    source_intensity: float
    confidence: float
    risk_level: str


class StationStatus(BaseModel):
    """CAAQMS station status"""
    id: str
    name: str
    lat: float
    lng: float
    aqi: int
    pm25: int
    status: str = Field(..., description="online, degraded, offline")
    updated_ago_min: int


# ============================================================================
# ATTRIBUTION MODELS
# ============================================================================

class AttributionOverview(BaseModel):
    """Source attribution percentages"""
    traffic: float
    industrial: float
    construction: float
    biomass: float
    dust: float
    residential: float


class PollutionHotspot(BaseModel):
    """Pollution source hotspot"""
    id: str
    lat: float
    lng: float
    source_type: str
    contribution: float = Field(..., description="Percentage contribution")
    intensity: float
    confidence: float
    ward: Optional[str] = None


class TimelineEntry(BaseModel):
    """Historical attribution data point"""
    timestamp: str
    traffic: float
    industrial: float
    construction: float
    biomass: float
    dust: float
    residential: float


# ============================================================================
# FORECAST MODELS
# ============================================================================

class ForecastRequest(BaseModel):
    """Forecast request parameters"""
    hours: int = Field(24, description="24, 48, or 72")
    emission_cut: float = Field(0, description="0-100 percentage")
    wind_boost: float = Field(0, description="0-200 percentage")


class ForecastResult(BaseModel):
    """Forecast result"""
    current_aqi: int
    forecast_aqi: int
    peak_aqi: int
    peak_hour: int
    uncertainty_low: int
    uncertainty_high: int
    horizon_hours: int


class ForecastGridFrame(BaseModel):
    """Single forecast grid frame"""
    hour: int
    label: str
    cells: List[Dict] = Field(..., description="Grid cells with lat, lng, aqi")
    city_avg: int
    peak_aqi: int


# ============================================================================
# ENFORCEMENT MODELS
# ============================================================================

class EnforcementCase(BaseModel):
    """Enforcement priority case"""
    id: str = Field(..., description="Unique case ID")
    site: str = Field(..., description="Site name")
    ward: str
    sourceType: str = Field(..., description="Type of pollution source")
    priority: str = Field(..., description="critical, high, medium, low")
    aqiImpact: float = Field(..., description="Enforcement Priority Score 0-100")
    roi: float = Field(..., description="Return on investment in AQI points")
    population_impacted: int
    violations: int
    confidence: float
    lastInspected: str = Field(..., description="Last inspection date")
    status: str = Field(default="queued", description="queued, dispatched, inspecting, resolved")
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")


class EnforcementDetail(BaseModel):
    """Detailed enforcement case information"""
    site_name: str
    ward: str
    source_type: str
    violations: int
    confidence: float
    recommendation: str
    expected_pm25_reduction: float
    population_impacted: int
    eps_score: float


class DispatchResponse(BaseModel):
    """Dispatch response"""
    status: str
    eta_hours: int
    dispatched_at: str


# ============================================================================
# CITIZEN INTELLIGENCE MODELS
# ============================================================================

class Ward(BaseModel):
    """Ward-level data"""
    id: str
    name: str
    aqi: int
    population: int
    schools: int
    hospitals: int
    risk_score: float
    lat: float
    lng: float


class Facility(BaseModel):
    """Facility (school, hospital, construction)"""
    id: str
    name: str
    type: str = Field(..., description="school, hospital, construction")
    lat: float
    lng: float
    aqi: int
    exposure: str = Field(..., description="critical, high, medium, low")


class HealthAdvisory(BaseModel):
    """AI-generated health advisory"""
    ward: str
    language: str
    advisory: str
    recommendations: List[str]
    risk_level: str


# ============================================================================
# INSIGHT MODELS
# ============================================================================

class AiInsight(BaseModel):
    """AI-generated insight"""
    id: str
    kind: str = Field(..., description="attribution, forecast, enforcement, health, anomaly")
    severity: str = Field(..., description="critical, high, medium, low")
    title: str
    body: str
    confidence: float
    timestamp: str
