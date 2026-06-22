"""Forecasting service"""
import numpy as np
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class ForecastService:
    def __init__(self):
        pass
    
    def run_forecast(self, hours: int = 24, emission_cut: float = 0, wind_boost: float = 0) -> Dict:
        """Run AQI forecast with scenario parameters"""
        np.random.seed(42)
        
        # Base current conditions
        current_aqi = 287
        
        # Apply scenario factors
        emission_factor = (1 - emission_cut / 100)
        wind_factor = (1 - wind_boost / 200)
        scenario_factor = emission_factor * wind_factor
        
        # Simple autoregressive forecast
        if hours == 24:
            trend_multiplier = 1.08  # Slight worsening
            uncertainty_pct = 0.10
        elif hours == 48:
            trend_multiplier = 1.12
            uncertainty_pct = 0.20
        else:  # 72h
            trend_multiplier = 1.15
            uncertainty_pct = 0.30
        
        forecast_aqi = int(current_aqi * trend_multiplier * scenario_factor + np.random.randn() * 10)
        peak_aqi = int(forecast_aqi * 1.15 + np.random.rand() * 20)
        peak_hour = min(hours, 18)  # Usually peaks in evening
        
        uncertainty_band = int(forecast_aqi * uncertainty_pct)
        uncertainty_low = max(50, forecast_aqi - uncertainty_band)
        uncertainty_high = forecast_aqi + uncertainty_band
        
        return {
            "current_aqi": current_aqi,
            "forecast_aqi": forecast_aqi,
            "peak_aqi": peak_aqi,
            "peak_hour": peak_hour,
            "uncertainty_low": uncertainty_low,
            "uncertainty_high": uncertainty_high,
            "horizon_hours": hours,
        }
    
    def get_forecast_grid(self, hours: int = 24) -> List[Dict]:
        """Generate forecast grid with uncertainty bands"""
        frames = []
        np.random.seed(42)
        
        # Hourly forecasts
        for h in range(0, hours + 1, 3):
            frame_seed = 100 + h
            np.random.seed(frame_seed)
            
            base_aqi = 287
            trend = 1 + (h / hours) * 0.15  # Trend over forecast horizon
            cells = []
            
            rows, cols = 14, 14
            lat_min, lat_max = 28.4, 28.88
            lng_min, lng_max = 76.84, 77.36
            
            total_aqi = 0
            peak_cell_aqi = 0
            
            for r in range(rows):
                for c in range(cols):
                    lat = lat_min + (lat_max - lat_min) * r / (rows - 1)
                    lng = lng_min + (lng_max - lng_min) * c / (cols - 1)
                    
                    # Distance-based hotspot model
                    aqi = 150
                    hotspots = [(28.6469, 77.3155, 1.0), (28.6692, 77.1, 0.8), (28.5355, 77.241, 0.55)]
                    for hlat, hlng, strength in hotspots:
                        d = np.hypot((lat - hlat) * 111, (lng - hlng) * 97)
                        aqi += strength * 230 * np.exp(-(d * d) / 18)
                    
                    aqi = int(aqi * trend + np.random.randn() * 20)
                    aqi = max(50, min(500, aqi))
                    
                    cells.append({"id": f"f-{h}-{r}-{c}", "lat": round(lat, 4), "lng": round(lng, 4), "aqi": aqi})
                    total_aqi += aqi
                    peak_cell_aqi = max(peak_cell_aqi, aqi)
            
            frames.append({
                "hour": h,
                "label": "Now" if h == 0 else f"+{h}h",
                "cells": cells,
                "city_avg": int(total_aqi / len(cells)),
                "peak_aqi": peak_cell_aqi,
            })
        
        return frames


# Global instance
_forecast_service = None

def get_forecast_service() -> ForecastService:
    global _forecast_service
    if _forecast_service is None:
        _forecast_service = ForecastService()
    return _forecast_service
