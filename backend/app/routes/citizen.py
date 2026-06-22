"""Citizen intelligence routes"""
from fastapi import APIRouter, HTTPException
from app.models.request_models import AdvisoryRequest
from app.models.response_models import Ward, Facility, HealthAdvisory
from app.services.citizen_service import get_citizen_service
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/citizen", tags=["Citizen"])


@router.get("/ward-risk", response_model=List[Ward])
async def get_ward_risk():
    """Get wards ranked by risk"""
    try:
        service = get_citizen_service()
        wards = service.get_ward_risk()
        return [Ward(**w) for w in wards]
    except Exception as e:
        logger.error(f"Ward risk error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/facilities", response_model=List[Facility])
async def get_facilities():
    """Get facilities ranked by exposure"""
    try:
        service = get_citizen_service()
        facilities = service.get_facilities()
        return [Facility(**f) for f in facilities]
    except Exception as e:
        logger.error(f"Facilities error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/advisory", response_model=HealthAdvisory)
async def generate_advisory(request: AdvisoryRequest):
    """Generate health advisory for ward"""
    try:
        if request.language not in ["en", "hi"]:
            raise HTTPException(status_code=400, detail="Language must be 'en' or 'hi'")
        
        service = get_citizen_service()
        advisory = service.generate_advisory(request.ward, request.language)
        return HealthAdvisory(**advisory)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Advisory generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
