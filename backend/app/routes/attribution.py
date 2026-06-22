"""Attribution routes"""
from fastapi import APIRouter, HTTPException
from app.models.response_models import AttributionOverview, PollutionHotspot, TimelineEntry
from app.services.attribution_service import get_attribution_service
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/attribution", tags=["Attribution"])


@router.get("/overview", response_model=AttributionOverview)
async def get_overview():
    """Get source attribution percentages"""
    try:
        service = get_attribution_service()
        data = service.get_attribution_overview()
        return AttributionOverview(**data)
    except Exception as e:
        logger.error(f"Attribution overview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hotspots", response_model=List[PollutionHotspot])
async def get_hotspots():
    """Get pollution source hotspots"""
    try:
        service = get_attribution_service()
        hotspots = service.get_hotspots()
        return [PollutionHotspot(**h) for h in hotspots]
    except Exception as e:
        logger.error(f"Hotspots error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeline", response_model=List[TimelineEntry])
async def get_timeline(days: int = 7):
    """Get historical attribution timeline"""
    try:
        service = get_attribution_service()
        timeline = service.get_timeline(days)
        return [TimelineEntry(**entry) for entry in timeline]
    except Exception as e:
        logger.error(f"Timeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
