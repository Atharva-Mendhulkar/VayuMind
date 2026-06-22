"""Command center routes"""
from fastapi import APIRouter, HTTPException
from app.models.response_models import DashboardMetric, GridCell, CellInspector, StationStatus
from app.services.pinn_service import get_pinn_service
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/command", tags=["Command Center"])

# Cache for grid
_grid_cache = None


@router.get("/dashboard", response_model=DashboardMetric)
async def get_dashboard():
    """Get command center dashboard metrics"""
    try:
        pinn = get_pinn_service()
        grid = pinn.generate_grid()
        
        aqi_values = [cell["aqi"] for cell in grid]
        pm25_values = [cell["pm25"] for cell in grid]
        
        city_aqi = int(sum(aqi_values) / len(aqi_values))
        city_pm25 = int(sum(pm25_values) / len(pm25_values))
        
        trend = "rising" if city_aqi > 280 else "stable" if city_aqi > 200 else "falling"
        
        return DashboardMetric(
            city_aqi=city_aqi,
            city_pm25=city_pm25,
            city_pm10=int(city_pm25 * 1.5),
            trend=trend,
            critical_hotspots=len([c for c in grid if c["aqi"] > 350]),
            active_alerts=4,
            stations_online=18,
            stations_total=20,
        )
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grid", response_model=List[GridCell])
async def get_grid():
    """Get 26x26 AQI grid"""
    try:
        global _grid_cache
        if _grid_cache is None:
            pinn = get_pinn_service()
            _grid_cache = pinn.generate_grid()
        return _grid_cache
    except Exception as e:
        logger.error(f"Grid error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cell/{cell_id}", response_model=CellInspector)
async def get_cell(cell_id: str):
    """Get detailed cell inspection data"""
    try:
        pinn = get_pinn_service()
        grid = pinn.generate_grid()
        cell = pinn.get_grid_cell(cell_id, grid)
        
        if not cell:
            raise HTTPException(status_code=404, detail="Cell not found")
        
        risk = "high" if cell["aqi"] > 300 else "medium" if cell["aqi"] > 200 else "low"
        
        return CellInspector(
            pm25=cell["pm25"],
            pm10=cell["pm10"],
            no2=cell["no2"],
            aqi=cell["aqi"],
            source_intensity=float(cell["aqi"] * 0.6),
            confidence=cell["confidence"],
            risk_level=risk,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cell inspection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stations", response_model=List[StationStatus])
async def get_stations():
    """Get CAAQMS station status"""
    try:
        import numpy as np
        
        stations = [
            {"name": "Anand Vihar", "lat": 28.6469, "lng": 77.3155},
            {"name": "R.K. Puram", "lat": 28.5635, "lng": 77.1855},
            {"name": "Punjabi Bagh", "lat": 28.6688, "lng": 77.1311},
            {"name": "Mandir Marg", "lat": 28.6362, "lng": 77.2007},
            {"name": "IGI Airport T3", "lat": 28.5562, "lng": 77.0999},
            {"name": "Dwarka Sector 8", "lat": 28.5710, "lng": 77.0719},
            {"name": "Rohini", "lat": 28.7325, "lng": 77.1199},
            {"name": "Najafgarh", "lat": 28.6090, "lng": 76.9854},
            {"name": "Jahangirpuri", "lat": 28.7327, "lng": 77.1709},
            {"name": "Sonia Vihar", "lat": 28.7105, "lng": 77.2495},
            {"name": "Nehru Nagar", "lat": 28.5677, "lng": 77.2510},
            {"name": "Wazirpur", "lat": 28.6992, "lng": 77.1654},
        ]
        
        np.random.seed(42)
        result = []
        
        for i, s in enumerate(stations):
            roll = np.random.rand()
            status = "offline" if roll > 0.9 else "degraded" if roll > 0.8 else "online"
            
            # Compute AQI at station
            aqi = 150
            hotspots = [(28.6469, 77.3155, 1.0), (28.6692, 77.1, 0.8), (28.5355, 77.241, 0.55)]
            for hlat, hlng, strength in hotspots:
                d = np.hypot((s["lat"] - hlat) * 111, (s["lng"] - hlng) * 97)
                aqi += strength * 230 * np.exp(-(d * d) / 18)
            
            aqi = int(np.clip(aqi, 50, 450))
            
            result.append(StationStatus(
                id=f"st-{i}",
                name=s["name"],
                lat=s["lat"],
                lng=s["lng"],
                aqi=aqi,
                pm25=int(aqi * 0.6),
                status=status,
                updated_ago_min=np.random.randint(1, 30),
            ))
        
        return result
    except Exception as e:
        logger.error(f"Stations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
