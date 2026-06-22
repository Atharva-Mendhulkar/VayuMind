"""Enforcement routes"""
from fastapi import APIRouter, HTTPException
from app.models.response_models import EnforcementCase, EnforcementDetail, DispatchResponse
from app.services.enforcement_service import get_enforcement_service
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/enforcement", tags=["Enforcement"])


@router.get("/queue", response_model=List[EnforcementCase])
async def get_queue():
    """Get prioritized enforcement queue"""
    try:
        service = get_enforcement_service()
        cases = service.get_enforcement_queue()
        return [EnforcementCase(**c) for c in cases]
    except Exception as e:
        logger.error(f"Enforcement queue error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/case/{site_id}", response_model=EnforcementDetail)
async def get_case(site_id: str):
    """Get detailed enforcement case"""
    try:
        service = get_enforcement_service()
        case = service.get_case_detail(site_id)
        
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        
        return EnforcementDetail(**case)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enforcement case error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dispatch/{site_id}", response_model=DispatchResponse)
async def dispatch_case(site_id: str):
    """Dispatch enforcement team to site"""
    try:
        service = get_enforcement_service()
        result = service.dispatch_case(site_id)
        return DispatchResponse(**result)
    except Exception as e:
        logger.error(f"Dispatch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
