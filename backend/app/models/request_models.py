"""Request models for VayuMind API"""
from pydantic import BaseModel, Field
from typing import Optional


class ForecastRequest(BaseModel):
    """Forecast computation request"""
    hours: int = Field(24, ge=24, le=72, description="24, 48, or 72 hours")
    emission_cut: float = Field(0, ge=0, le=100, description="Emission reduction %")
    wind_boost: float = Field(0, ge=0, le=200, description="Wind speed boost %")


class AdvisoryRequest(BaseModel):
    """Health advisory generation request"""
    ward: str
    language: str = Field("en", description="en or hi")
