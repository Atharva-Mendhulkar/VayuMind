"""Attribution and source analysis service"""
import json
import numpy as np
from typing import List, Dict, Optional
from app.config import DATA_DIR
import logging

logger = logging.getLogger(__name__)


class AttributionService:
    def __init__(self):
        self.load_data()
    
    def load_data(self):
        """Load violations and station data"""
        try:
            violations_file = DATA_DIR / "violations.json"
            if violations_file.exists():
                with open(violations_file) as f:
                    self.violations = json.load(f)
            else:
                self.violations = {}
        except Exception as e:
            logger.error(f"Error loading violations: {e}")
            self.violations = {}
    
    def get_attribution_overview(self) -> Dict[str, float]:
        """Get source attribution percentages"""
        np.random.seed(42)
        total = 100.0
        
        # Deterministic attribution
        sources = {
            "traffic": 31.0,
            "industrial": 24.0,
            "construction": 18.0,
            "biomass": 15.0,
            "dust": 8.0,
            "residential": 4.0,
        }
        
        # Add small random variations
        for key in sources:
            sources[key] += np.random.randn() * 0.5
        
        # Normalize to 100
        current_sum = sum(sources.values())
        for key in sources:
            sources[key] = sources[key] / current_sum * 100
        
        return {k: round(v, 1) for k, v in sources.items()}
    
    def get_hotspots(self) -> List[Dict]:
        """Get pollution source hotspots"""
        hotspots_raw = [
            {"name": "Anand Vihar Transport Hub", "lat": 28.6469, "lng": 77.3155, "type": "traffic", "intensity_base": 31},
            {"name": "Wazirpur Industrial Area", "lat": 28.6692, "lng": 77.1, "type": "industrial", "intensity_base": 24},
            {"name": "Okhla Construction Zone", "lat": 28.5355, "lng": 77.241, "type": "construction", "intensity_base": 18},
            {"name": "Bawana Industrial Estate", "lat": 28.7041, "lng": 77.1025, "type": "industrial", "intensity_base": 20},
            {"name": "Dwarka Dust Corridor", "lat": 28.5921, "lng": 77.046, "type": "dust", "intensity_base": 8},
            {"name": "Mundka Biomass Belt", "lat": 28.6822, "lng": 77.0319, "type": "biomass", "intensity_base": 15},
        ]
        
        hotspots = []
        wards_mapping = {
            "Anand Vihar Transport Hub": "Anand Vihar",
            "Wazirpur Industrial Area": "Wazirpur",
            "Okhla Construction Zone": "Okhla",
            "Bawana Industrial Estate": "Bawana",
            "Dwarka Dust Corridor": "Dwarka",
            "Mundka Biomass Belt": "Mundka",
        }
        
        np.random.seed(42)
        for i, h in enumerate(hotspots_raw):
            intensity = h["intensity_base"] * (1 + np.random.randn() * 0.1)
            hotspots.append({
                "id": f"H{i+1}",
                "lat": h["lat"],
                "lng": h["lng"],
                "source_type": h["type"],
                "contribution": round(h["intensity_base"] / 100 * 100, 1),
                "intensity": round(max(50, intensity), 1),
                "confidence": round(0.7 + np.random.rand() * 0.25, 2),
                "ward": wards_mapping.get(h["name"], "Unknown"),
                "name": h["name"]
            })
        
        return sorted(hotspots, key=lambda x: x["intensity"], reverse=True)
    
    def get_timeline(self, days: int = 7) -> List[Dict]:
        """Get historical attribution timeline"""
        timeline = []
        np.random.seed(42)
        
        for day in range(days):
            base = {
                "traffic": 31,
                "industrial": 24,
                "construction": 18,
                "biomass": 15,
                "dust": 8,
                "residential": 4,
            }
            
            # Add variation over time
            for key in base:
                base[key] = base[key] * (1 + np.sin(day / 7 * 2 * np.pi) * 0.1 + np.random.randn() * 0.05)
            
            # Normalize
            total = sum(base.values())
            entry = {
                "timestamp": f"2024-12-{16+day:02d}T00:00:00Z",
                **{k: round(v / total * 100, 1) for k, v in base.items()}
            }
            timeline.append(entry)
        
        return timeline


# Global instance
_attribution_service = None

def get_attribution_service() -> AttributionService:
    global _attribution_service
    if _attribution_service is None:
        _attribution_service = AttributionService()
    return _attribution_service
