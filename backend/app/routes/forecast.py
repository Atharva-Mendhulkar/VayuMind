"""Forecast routes"""
from fastapi import APIRouter, HTTPException
from app.models.request_models import ForecastRequest
from app.models.response_models import ForecastResult, ForecastGridFrame
from app.services.forecast_service import get_forecast_service
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/forecast", tags=["Forecast"])


@router.post("/run", response_model=ForecastResult)
async def run_forecast(request: ForecastRequest):
    """Run AQI forecast with scenario parameters"""
    try:
        if request.hours not in [24, 48, 72]:
            raise HTTPException(status_code=400, detail="Hours must be 24, 48, or 72")
        
        service = get_forecast_service()
        result = service.run_forecast(
            hours=request.hours,
            emission_cut=request.emission_cut,
            wind_boost=request.wind_boost
        )
        return ForecastResult(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grid/{hours}", response_model=List[ForecastGridFrame])
async def get_forecast_grid(hours: int):
    """Get forecast grid for specified horizon"""
    try:
        if hours not in [24, 48, 72]:
            raise HTTPException(status_code=400, detail="Hours must be 24, 48, or 72")
        
        service = get_forecast_service()
        frames = service.get_forecast_grid(hours)
        return [ForecastGridFrame(**f) for f in frames]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forecast grid error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
