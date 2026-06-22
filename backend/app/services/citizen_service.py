"""Citizen intelligence and health advisory service"""
import json
import numpy as np
from typing import List, Dict, Optional
from app.config import DATA_DIR, GEMINI_API_KEY, GEMINI_MODEL
import logging
import os

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("Gemini API not available, using fallback templates")


class CitizenService:
    def __init__(self):
        self.wards_db = {}
        self.facilities_db = []
        self.load_data()
        
        if GEMINI_AVAILABLE and GEMINI_API_KEY:
            try:
                genai.configure(api_key=GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Gemini config error: {e}")
    
    def load_data(self):
        """Load wards and facilities data"""
        try:
            wards_file = DATA_DIR / "wards.json"
            if wards_file.exists():
                with open(wards_file) as f:
                    wards_data = json.load(f)
                    self.wards_db = {w["name"]: w for w in wards_data}
            
            facilities_file = DATA_DIR / "facilities.json"
            if facilities_file.exists():
                with open(facilities_file) as f:
                    self.facilities_db = json.load(f)
        except Exception as e:
            logger.error(f"Error loading citizen data: {e}")
    
    def get_ward_risk(self) -> List[Dict]:
        """Get wards ranked by air quality risk"""
        np.random.seed(42)
        
        wards_raw = [
            {"name": "Anand Vihar", "population": 185000, "lat": 28.6469, "lng": 77.3155},
            {"name": "Shahdara", "population": 320000, "lat": 28.6735, "lng": 77.2896},
            {"name": "Rohini", "population": 420000, "lat": 28.7325, "lng": 77.1199},
            {"name": "Dwarka", "population": 510000, "lat": 28.5921, "lng": 77.046},
            {"name": "Najafgarh", "population": 280000, "lat": 28.609, "lng": 76.9854},
            {"name": "Karol Bagh", "population": 380000, "lat": 28.6512, "lng": 77.1907},
            {"name": "Saket", "population": 290000, "lat": 28.5245, "lng": 77.206},
            {"name": "Civil Lines", "population": 210000, "lat": 28.6818, "lng": 77.2226},
            {"name": "Mayur Vihar", "population": 350000, "lat": 28.6092, "lng": 77.295},
            {"name": "Janakpuri", "population": 410000, "lat": 28.6219, "lng": 77.0878},
        ]
        
        wards = []
        hotspots = [
            (28.6469, 77.3155, 1.0),
            (28.6692, 77.1, 0.8),
            (28.5355, 77.241, 0.55),
            (28.7041, 77.1025, 0.7),
            (28.5921, 77.046, 0.5),
        ]
        
        for i, w in enumerate(wards_raw):
            # Compute AQI based on distance to hotspots
            aqi = 150
            for hlat, hlng, strength in hotspots:
                d = np.hypot((w["lat"] - hlat) * 111, (w["lng"] - hlng) * 97)
                aqi += strength * 230 * np.exp(-(d * d) / 18)
            
            aqi = int(np.clip(aqi + np.random.randn() * 20, 50, 450))
            
            # Risk score = AQI weight + population weight
            risk_score = (aqi / 500) * 70 + (w["population"] / 700000) * 30
            
            wards.append({
                "id": f"w-{i}",
                "name": w["name"],
                "aqi": aqi,
                "population": w["population"],
                "schools": int(20 + w["population"] / 10000),
                "hospitals": int(2 + w["population"] / 100000),
                "risk_score": round(risk_score, 1),
                "lat": w["lat"],
                "lng": w["lng"],
            })
        
        return sorted(wards, key=lambda x: x["risk_score"], reverse=True)
    
    def get_facilities(self) -> List[Dict]:
        """Get facilities ranked by exposure"""
        np.random.seed(42)
        
        facilities_raw = []
        wards = self.get_ward_risk()
        
        for w in wards:
            schools = int(20 + w["population"] / 10000)
            hospitals = int(2 + w["population"] / 100000)
            
            for s in range(min(3, schools)):
                exposure = "critical" if w["aqi"] > 350 else "high" if w["aqi"] > 250 else "medium" if w["aqi"] > 150 else "low"
                facilities_raw.append({
                    "id": f"sch-{w['name']}-{s}",
                    "name": f"{w['name']} School #{s+1}",
                    "type": "school",
                    "lat": w["lat"] + np.random.randn() * 0.01,
                    "lng": w["lng"] + np.random.randn() * 0.01,
                    "aqi": w["aqi"],
                    "exposure": exposure,
                })
            
            for h in range(min(2, hospitals)):
                exposure = "critical" if w["aqi"] > 350 else "high" if w["aqi"] > 250 else "medium" if w["aqi"] > 150 else "low"
                facilities_raw.append({
                    "id": f"hosp-{w['name']}-{h}",
                    "name": f"{w['name']} Hospital #{h+1}",
                    "type": "hospital",
                    "lat": w["lat"] + np.random.randn() * 0.01,
                    "lng": w["lng"] + np.random.randn() * 0.01,
                    "aqi": w["aqi"],
                    "exposure": exposure,
                })
        
        return sorted(facilities_raw, key=lambda x: (x["exposure"] in ["critical", "high"], x["aqi"]), reverse=True)
    
    def generate_advisory(self, ward: str, language: str = "en") -> Dict:
        """Generate health advisory using Gemini or template"""
        
        # Get ward data
        wards = self.get_ward_risk()
        ward_data = next((w for w in wards if w["name"] == ward), None)
        
        if not ward_data:
            ward_data = wards[0]  # Fallback to first ward
        
        aqi = ward_data["aqi"]
        
        # Try Gemini API
        if GEMINI_AVAILABLE and GEMINI_API_KEY:
            try:
                return self._generate_with_gemini(ward, aqi, language)
            except Exception as e:
                logger.error(f"Gemini generation failed: {e}, using fallback")
        
        # Fallback to template
        return self._generate_template_advisory(ward, aqi, language)
    
    def _generate_with_gemini(self, ward: str, aqi: int, language: str) -> Dict:
        """Generate advisory using Gemini"""
        model = genai.GenerativeModel(GEMINI_MODEL)
        
        prompt = f"""Generate a brief health advisory for residents of {ward} ward in Delhi with current AQI of {aqi}.
        
        Language: {"Hindi" if language == "hi" else "English"}
        
        Include:
        1. Concise AQI assessment
        2. Health risks for vulnerable groups
        3. Specific outdoor activity recommendations
        4. Mask/protection guidance
        5. Indoor air quality tips
        
        Keep it under 150 words. Be actionable and practical."""
        
        response = model.generate_content(prompt)
        advisory_text = response.text
        
        # Extract recommendations
        recommendations = self._extract_recommendations(advisory_text, aqi)
        
        return {
            "ward": ward,
            "language": language,
            "advisory": advisory_text[:300],  # Truncate if needed
            "recommendations": recommendations,
            "risk_level": self._get_risk_level(aqi),
        }
    
    def _generate_template_advisory(self, ward: str, aqi: int, language: str) -> Dict:
        """Generate advisory from template"""
        
        if language == "hi":
            templates = {
                "critical": f"{ward} में वायु गुणवत्ता गंभीर है। बाहर निकलने से बचें। N95 मास्क अनिवार्य है। बुजुर्ग और बच्चों को विशेष सावधानी रखें।",
                "poor": f"{ward} में हवा की गुणवत्ता खराब है। बाहरी व्यायाम कम करें। सभी को मास्क पहनना चाहिए।",
                "moderate": f"{ward} में हवा की गुणवत्ता मध्यम है। संवेदनशील लोगों को सावधानी रखनी चाहिए।",
                "good": f"{ward} में हवा की गुणवत्ता अच्छी है। बाहरी गतिविधियां सुरक्षित हैं।",
            }
            recommendations_hi = {
                "critical": ["घर के अंदर रहें", "N95 मास्क पहनें", "हल्का व्यायाम करें", "HEPA फ़िल्टर चलाएं"],
                "poor": ["बाहरी व्यायाम कम करें", "मास्क पहनें", "खिड़कियां बंद रखें"],
                "moderate": ["संवेदनशील लोगों को सावधानी रखें", "HEPA फ़िल्टर उपयोग करें"],
                "good": ["सामान्य गतिविधि जारी रखें"],
            }
        else:
            templates = {
                "critical": f"Critical air quality in {ward}. Avoid outdoor activities. Wear N95 masks. Vulnerable groups should stay indoors.",
                "poor": f"Poor air quality in {ward}. Reduce outdoor exercise. Wear masks. Close windows and use air purifiers.",
                "moderate": f"Moderate air quality in {ward}. Sensitive groups should limit outdoor activities. Use HEPA filters.",
                "good": f"Good air quality in {ward}. Outdoor activities are safe. Continue normal routines.",
            }
            recommendations_hi = {
                "critical": ["Stay indoors", "Wear N95 masks", "Avoid outdoor exercise", "Use HEPA filters"],
                "poor": ["Limit outdoor activity", "Wear masks", "Close windows", "Use air purifiers"],
                "moderate": ["Sensitive groups should avoid prolonged exposure", "Use HEPA filters"],
                "good": ["Outdoor activities are safe", "Continue normal activities"],
            }
        
        risk_level = self._get_risk_level(aqi)
        advisory = templates[risk_level]
        recommendations = recommendations_hi[risk_level]
        
        return {
            "ward": ward,
            "language": language,
            "advisory": advisory,
            "recommendations": recommendations,
            "risk_level": risk_level,
        }
    
    def _get_risk_level(self, aqi: int) -> str:
        """Determine risk level from AQI"""
        if aqi >= 401:
            return "critical"
        elif aqi >= 301:
            return "poor"
        elif aqi >= 201:
            return "moderate"
        else:
            return "good"
    
    def _extract_recommendations(self, advisory_text: str, aqi: int) -> List[str]:
        """Extract action items from advisory text"""
        default_recs = {
            "critical": ["Stay indoors", "Wear N95 masks", "Use HEPA filters", "Avoid outdoor exercise"],
            "poor": ["Limit outdoor activity", "Wear masks", "Use air purifiers"],
            "moderate": ["Sensitive groups should take precautions", "Use HEPA filters"],
            "good": ["Outdoor activities are safe"],
        }
        risk = self._get_risk_level(aqi)
        return default_recs[risk]


# Global instance
_citizen_service = None

def get_citizen_service() -> CitizenService:
    global _citizen_service
    if _citizen_service is None:
        _citizen_service = CitizenService()
    return _citizen_service
