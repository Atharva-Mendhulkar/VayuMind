"""Enforcement intelligence service"""
import json
import numpy as np
from typing import List, Dict, Optional
from app.config import DATA_DIR, EPS_WEIGHTS
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class EnforcementService:
    def __init__(self):
        self.violations_db = {}
        self.load_data()
        self.dispatch_tracker = {}
    
    def load_data(self):
        """Load violations and enforcement data"""
        try:
            violations_file = DATA_DIR / "violations.json"
            if violations_file.exists():
                with open(violations_file) as f:
                    self.violations_db = json.load(f)
        except Exception as e:
            logger.error(f"Error loading violations: {e}")
    
    def calculate_eps(self, site_id: str, source_intensity: float, population_exposed: int, forecast_deterioration: float, violation_count: int) -> float:
        """Calculate Enforcement Priority Score (0-100)"""
        # Normalize components to 0-1
        intensity_norm = min(source_intensity / 100, 1.0)
        pop_norm = min(population_exposed / 100000, 1.0)  # 100k is max
        forecast_norm = min(forecast_deterioration / 100, 1.0)
        violation_norm = min(violation_count / 10, 1.0)  # 10 is max
        
        eps = (
            EPS_WEIGHTS["source_intensity"] * intensity_norm * 100 +
            EPS_WEIGHTS["population_exposure"] * pop_norm * 100 +
            EPS_WEIGHTS["forecast_deterioration"] * forecast_norm * 100 +
            EPS_WEIGHTS["violation_history"] * violation_norm * 100
        )
        
        return round(min(100, max(0, eps)), 1)
    
    def get_enforcement_queue(self) -> List[Dict]:
        """Get ranked enforcement cases"""
        np.random.seed(42)
        
        cases_raw = [
            {"name": "Okhla Phase II Construction", "ward": "Okhla", "type": "construction", "intensity": 85, "pop": 35000, "violations": 5},
            {"name": "Wazirpur Rolling Mills", "ward": "Wazirpur", "type": "industrial", "intensity": 92, "pop": 42000, "violations": 7},
            {"name": "Bawana Plastic Units", "ward": "Bawana", "type": "industrial", "intensity": 78, "pop": 28000, "violations": 4},
            {"name": "Mundka Waste Burning", "ward": "Mundka", "type": "biomass", "intensity": 71, "pop": 25000, "violations": 3},
            {"name": "Anand Vihar Idling Congestion", "ward": "Anand Vihar", "type": "traffic", "intensity": 68, "pop": 48000, "violations": 6},
            {"name": "Dwarka Expressway Earthworks", "ward": "Dwarka", "type": "dust", "intensity": 55, "pop": 18000, "violations": 2},
            {"name": "Narela DSIIDC Industrial", "ward": "Narela", "type": "industrial", "intensity": 73, "pop": 22000, "violations": 4},
        ]
        
        cases = []
        for i, c in enumerate(cases_raw):
            forecast_det = np.random.rand() * 50 + 30  # 30-80
            eps = self.calculate_eps(
                f"IND{i+1:03d}",
                c["intensity"],
                c["pop"],
                forecast_det,
                c["violations"]
            )
            
            priority = "critical" if eps >= 80 else "high" if eps >= 60 else "medium" if eps >= 40 else "low"
            roi = int(c["intensity"] * (1.5 + np.random.rand() * 2.0))
            
            status = np.random.choice(["queued", "queued", "dispatched", "inspecting"], p=[0.4, 0.4, 0.1, 0.1])
            
            cases.append({
                "id": f"IND{i+1:03d}",
                "site": c["name"],
                "ward": c["ward"],
                "sourceType": c["type"],
                "priority": priority,
                "aqiImpact": eps,
                "roi": roi,
                "population_impacted": c["pop"],
                "violations": c["violations"],
                "confidence": round(0.6 + np.random.rand() * 0.35, 2),
                "lastInspected": f"{np.random.randint(1, 45)}d ago",
                "status": status,
                "lat": 28.7041 + (np.random.rand() - 0.5) * 0.2,
                "lng": 77.1025 + (np.random.rand() - 0.5) * 0.2,
            })
        
        # Sort by aqiImpact (EPS) descending
        return sorted(cases, key=lambda x: x["aqiImpact"], reverse=True)
    
    def get_case_detail(self, site_id: str) -> Optional[Dict]:
        """Get detailed enforcement case information"""
        queue = self.get_enforcement_queue()
        case = next((c for c in queue if c["id"] == site_id), None)
        
        if not case:
            return None
        
        np.random.seed(hash(site_id) % 2**32)
        
        return {
            "site_name": case["site"],
            "ward": case["ward"],
            "source_type": case["sourceType"],
            "violations": case["violations"],
            "confidence": case["confidence"],
            "recommendation": self._generate_recommendation(case["sourceType"]),
            "expected_pm25_reduction": round(np.random.rand() * 15 + 5, 1),
            "population_impacted": case["population_impacted"],
            "eps_score": case["aqiImpact"],
        }
    
    def _generate_recommendation(self, source_type: str) -> str:
        """Generate AI recommendation based on source type"""
        recommendations = {
            "traffic": "Dispatch traffic police to clear idling vehicles. Issue congestion clearance notice.",
            "industrial": "Issue immediate stop-work notice. Deploy air quality monitoring team within 2 hours.",
            "construction": "Verify dust control compliance. Require water sprinkling and tarpaulin coverage.",
            "biomass": "Deploy night patrol. Confiscate biomass burning materials. Fine operator.",
            "dust": "Issue soil erosion control notice. Require stabilization measures.",
            "residential": "Issue awareness notices. Schedule community meeting.",
        }
        return recommendations.get(source_type, "Conduct field inspection and take appropriate action.")
    
    def dispatch_case(self, site_id: str) -> Dict:
        """Record case dispatch"""
        self.dispatch_tracker[site_id] = {
            "timestamp": datetime.now().isoformat(),
            "eta": 2,
        }
        
        return {
            "status": "dispatched",
            "eta_hours": 2,
            "dispatched_at": datetime.now().isoformat(),
        }


# Global instance
_enforcement_service = None

def get_enforcement_service() -> EnforcementService:
    global _enforcement_service
    if _enforcement_service is None:
        _enforcement_service = EnforcementService()
    return _enforcement_service
