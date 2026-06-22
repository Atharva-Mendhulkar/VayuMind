"""Configuration for VayuMind backend"""
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
DATA_DIR = BASE_DIR / "app" / "data"
MODELS_DIR = BASE_DIR / "models"
AUDIT_FILES_DIR = BASE_DIR.parent / "audit_files"

# Model paths
PINN_MODEL_PATH = AUDIT_FILES_DIR / "pinn_delhi_final.pth"
SCALER_STATS_PATH = AUDIT_FILES_DIR / "scaler_stats.json"

# Data files
FACILITIES_FILE = DATA_DIR / "facilities.json"
WARDS_FILE = DATA_DIR / "wards.json"
VIOLATIONS_FILE = DATA_DIR / "violations.json"
POPULATION_FILE = DATA_DIR / "population.json"
STATIONS_FILE = DATA_DIR / "stations.json"

# API Settings
API_HOST = "0.0.0.0"
API_PORT = 8000
API_RELOAD = True

# CORS
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "*",
]

# Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-1.5-flash"

# Cache TTL (seconds)
CACHE_TTL = {
    "grid": 300,
    "sources": 300,
    "stations": 60,
    "forecast": 600,
    "enforcement": 300,
    "wards": 3600,
}

# Delhi Geographic Bounds
DELHI_CENTER = (28.6139, 77.209)
DELHI_BOUNDS = {
    "min_lat": 28.4,
    "max_lat": 28.88,
    "min_lng": 76.84,
    "max_lng": 77.36,
}

# Grid configuration
GRID_ROWS = 26
GRID_COLS = 26

# Enforcement scoring weights
EPS_WEIGHTS = {
    "source_intensity": 0.4,
    "population_exposure": 0.3,
    "forecast_deterioration": 0.2,
    "violation_history": 0.1,
}

# AQI thresholds
AQI_THRESHOLDS = {
    "good": 50,
    "satisfactory": 100,
    "moderately_polluted": 200,
    "poor": 300,
    "very_poor": 400,
    "severe": 500,
}
