import os
import time
import math
import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

import numpy as np
import torch
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel

# Add Code/src to path so we can import lib
import sys
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), "Code", "src"))

from lib.model import AirQualityNet, DiffusivityNet

app = FastAPI(title="Delhi PM2.5 PINN API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants & Scaler Stats
SCALERS = {
    "u10": {"mean": 0.073155, "std": 1.673281},
    "v10": {"mean": 0.720681, "std": 1.326549},
    "t2m": {"mean": 294.050758, "std": 7.481776},
    "blh": {"mean": 126.971713, "std": 134.529203},
    "pm25": {"mean": 101.7945, "std": 87.171663}
}

BOUNDS = {
    "lat_min": 28.6469, "lat_max": 28.7333,
    "lon_min": 77.2833, "lon_max": 77.4530,
    "t_min": 1546300800.0, "t_max": 1703980800.0
}

STATIONS = [
  {"id": "pusa", "lat": 28.6417, "lon": 77.1490, "elevation": 220, "urban": 1, "dist_road": 0.3},
  {"id": "anand_vihar", "lat": 28.6508, "lon": 77.3152, "elevation": 215, "urban": 1, "dist_road": 0.1},
  {"id": "ihbas", "lat": 28.6817, "lon": 77.3020, "elevation": 212, "urban": 1, "dist_road": 0.4},
  {"id": "mandir_marg", "lat": 28.6358, "lon": 77.1988, "elevation": 218, "urban": 1, "dist_road": 0.2},
  {"id": "punjabi_bagh", "lat": 28.6738, "lon": 77.1243, "elevation": 222, "urban": 1, "dist_road": 0.15},
  {"id": "rohini", "lat": 28.7041, "lon": 77.1025, "elevation": 225, "urban": 1, "dist_road": 0.2},
  {"id": "r_k_puram", "lat": 28.5651, "lon": 77.1840, "elevation": 213, "urban": 1, "dist_road": 0.25},
  {"id": "siri_fort", "lat": 28.5497, "lon": 77.2167, "elevation": 216, "urban": 1, "dist_road": 0.35}
]

DEVICE = "cpu"
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Code", "models", "pinn_delhi_final.pth")

c_net = AirQualityNet(input_dim=15, hidden_dim=128, num_layers=9, dropout_p=0.05)
k_net = DiffusivityNet(input_dim=7, hidden_dim=64, n_layers=3)
checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)

# Dynamically map checkpoint keys to match AirQualityNet architecture
state_dict = checkpoint['c_net_state_dict']
weights = [v for k, v in state_dict.items() if k.endswith('.weight')]
biases = [v for k, v in state_dict.items() if k.endswith('.bias')]

target_weights = [k for k in c_net.state_dict().keys() if k.endswith('.weight')]
target_biases = [k for k in c_net.state_dict().keys() if k.endswith('.bias')]

new_state_dict = {}
for tgt_k, src_v in zip(target_weights, weights):
    new_state_dict[tgt_k] = src_v
for tgt_k, src_v in zip(target_biases, biases):
    new_state_dict[tgt_k] = src_v

c_net.load_state_dict(new_state_dict)
k_net.load_state_dict(checkpoint['k_net_state_dict'])
c_net.eval()
k_net.eval()

# Simple Cache
CACHE = {
    "sources": {"data": None, "timestamp": 0},
    "grid": {"data": None, "timestamp": 0},
    "stations": {"data": None, "timestamp": 0}
}

async def fetch_open_meteo(lat=28.69, lon=77.37):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=wind_speed_10m,wind_direction_10m,temperature_2m,boundary_layer_height&wind_speed_unit=ms&timezone=Asia%2FKolkata&forecast_days=2"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"Open-Meteo fetch failed: {e}")
        return None

def normalize(val, key):
    return (val - SCALERS[key]["mean"]) / SCALERS[key]["std"]

def get_time_features(ts: float):
    dt = datetime.fromtimestamp(ts)
    hour = dt.hour
    doy = dt.timetuple().tm_yday
    dow = dt.weekday()
    
    h_sin = math.sin(2 * math.pi * hour / 24)
    h_cos = math.cos(2 * math.pi * hour / 24)
    d_sin = math.sin(2 * math.pi * doy / 365)
    d_cos = math.cos(2 * math.pi * doy / 365)
    
    t_norm = (ts - BOUNDS["t_min"]) / (BOUNDS["t_max"] - BOUNDS["t_min"])
    t_norm = 2 * t_norm - 1
    
    return t_norm, h_sin, h_cos, d_sin, d_cos, dow

def get_met_features(meteo_data, hour_idx=0):
    if meteo_data and "hourly" in meteo_data:
        wspd = meteo_data["hourly"]["wind_speed_10m"][hour_idx]
        wdir = meteo_data["hourly"]["wind_direction_10m"][hour_idx]
        t2m = meteo_data["hourly"]["temperature_2m"][hour_idx] + 273.15 # assuming open-meteo returns C
        blh = meteo_data["hourly"]["boundary_layer_height"][hour_idx]
        
        u10 = -wspd * math.sin(math.radians(wdir))
        v10 = -wspd * math.cos(math.radians(wdir))
    else:
        u10 = SCALERS["u10"]["mean"]
        v10 = SCALERS["v10"]["mean"]
        t2m = SCALERS["t2m"]["mean"]
        blh = SCALERS["blh"]["mean"]

    u10_norm = normalize(u10, "u10")
    v10_norm = normalize(v10, "v10")
    t2m_norm = normalize(t2m, "t2m")
    blh_norm = normalize(blh, "blh")
    
    return u10_norm, v10_norm, t2m_norm, blh_norm, {"u10": u10, "v10": v10, "t2m": t2m, "blh": blh}

def generate_features_tensor(lats, lons, ts, met_features):
    u10_norm, v10_norm, t2m_norm, blh_norm, _ = met_features
    t_norm, h_sin, h_cos, d_sin, d_cos, dow = get_time_features(ts)
    
    flat_lat = lats.flatten()
    flat_lon = lons.flatten()
    
    x_norm = 2 * (flat_lon - BOUNDS["lon_min"]) / (BOUNDS["lon_max"] - BOUNDS["lon_min"]) - 1
    y_norm = 2 * (flat_lat - BOUNDS["lat_min"]) / (BOUNDS["lat_max"] - BOUNDS["lat_min"]) - 1
    
    N = len(flat_lat)
    # Default static features
    elevation_norm = np.zeros(N)
    urban_flag = np.ones(N)
    dist_to_road_norm = np.zeros(N)
    
    features = np.stack([
        x_norm, y_norm, np.full(N, t_norm),
        np.full(N, u10_norm), np.full(N, v10_norm), np.full(N, t2m_norm), np.full(N, blh_norm),
        np.full(N, h_sin), np.full(N, h_cos), np.full(N, d_sin), np.full(N, d_cos), np.full(N, dow),
        elevation_norm, urban_flag, dist_to_road_norm
    ], axis=1)
    
    return torch.tensor(features, dtype=torch.float32)

@app.get("/api/grid")
async def get_grid(timestamp: Optional[str] = None):
    now = time.time()
    if timestamp:
        try:
            ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).timestamp()
        except:
            ts = now
    else:
        ts = now
        
    if not timestamp and now - CACHE["grid"]["timestamp"] < 300:
        if CACHE["grid"]["data"]:
            return CACHE["grid"]["data"]

    meteo_data = await fetch_open_meteo()
    met_features = get_met_features(meteo_data, hour_idx=0)
    
    lats = np.linspace(BOUNDS["lat_min"], BOUNDS["lat_max"], 50)
    lons = np.linspace(BOUNDS["lon_min"], BOUNDS["lon_max"], 50)
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    
    X = generate_features_tensor(lat_grid, lon_grid, ts, met_features)
    
    with torch.no_grad():
        preds_norm = c_net(X).numpy().flatten()
        
    preds_phys = preds_norm * SCALERS["pm25"]["std"] + SCALERS["pm25"]["mean"]
    preds_phys = np.clip(preds_phys, 0, 600)
    
    grid_out = []
    flat_lat = lat_grid.flatten()
    flat_lon = lon_grid.flatten()
    for i in range(len(preds_phys)):
        grid_out.append({"lat": float(flat_lat[i]), "lon": float(flat_lon[i]), "pm25": float(preds_phys[i])})
        
    resp = {"grid": grid_out, "timestamp": datetime.fromtimestamp(ts).isoformat(), "met": met_features[4]}
    
    if not timestamp:
        CACHE["grid"]["data"] = resp
        CACHE["grid"]["timestamp"] = now
        
    return resp

@app.get("/api/sources")
async def get_sources():
    now = time.time()
    if now - CACHE["sources"]["timestamp"] < 3600 and CACHE["sources"]["data"]:
        return CACHE["sources"]["data"]
        
    ts = now
    meteo_data = await fetch_open_meteo()
    met_features = get_met_features(meteo_data, hour_idx=0)
    
    lats = np.linspace(BOUNDS["lat_min"], BOUNDS["lat_max"], 50)
    lons = np.linspace(BOUNDS["lon_min"], BOUNDS["lon_max"], 50)
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    
    X_base = generate_features_tensor(lat_grid, lon_grid, ts, met_features)
    
    x_norm_c = X_base[:, 0:1].detach().requires_grad_(True)
    y_norm_c = X_base[:, 1:2].detach().requires_grad_(True)
    t_norm_c = X_base[:, 2:3].detach().requires_grad_(True)
    
    X_colloc = torch.cat([x_norm_c, y_norm_c, t_norm_c, X_base[:, 3:]], dim=1)
    
    c_pred = c_net(X_colloc)
    
    # K prediction (7 dims)
    x_met = torch.cat([x_norm_c, y_norm_c, t_norm_c, X_base[:, 3:7]], dim=1)
    K_pred = k_net(x_met)
    
    # Met phys
    u10_phys = X_base[:, 3:4] * SCALERS["u10"]["std"] + SCALERS["u10"]["mean"]
    v10_phys = X_base[:, 4:5] * SCALERS["v10"]["std"] + SCALERS["v10"]["mean"]
    
    # Note: PDE scale values
    L_y = (BOUNDS["lat_max"] - BOUNDS["lat_min"]) * 111000 / 2
    L_x = (BOUNDS["lon_max"] - BOUNDS["lon_min"]) * 111000 * math.cos(math.radians(28.69)) / 2
    L_t = (BOUNDS["t_max"] - BOUNDS["t_min"]) / 2
    c_std = SCALERS["pm25"]["std"]
    
    dC_dt = torch.autograd.grad(c_pred, t_norm_c, torch.ones_like(c_pred), create_graph=True)[0] * (c_std / L_t)
    dC_dx = torch.autograd.grad(c_pred, x_norm_c, torch.ones_like(c_pred), create_graph=True)[0] * (c_std / L_x)
    dC_dy = torch.autograd.grad(c_pred, y_norm_c, torch.ones_like(c_pred), create_graph=True)[0] * (c_std / L_y)
    
    advection = u10_phys * dC_dx + v10_phys * dC_dy
    
    d2C_dx2 = torch.autograd.grad(dC_dx, x_norm_c, torch.ones_like(dC_dx), create_graph=True)[0] * (c_std / L_x**2)
    d2C_dy2 = torch.autograd.grad(dC_dy, y_norm_c, torch.ones_like(dC_dy), create_graph=True)[0] * (c_std / L_y**2)
    laplacian_C = d2C_dx2 + d2C_dy2
    
    dK_dx = torch.autograd.grad(K_pred, x_norm_c, torch.ones_like(K_pred), create_graph=True)[0] / L_x
    dK_dy = torch.autograd.grad(K_pred, y_norm_c, torch.ones_like(K_pred), create_graph=True)[0] / L_y
    
    diffusion = K_pred * laplacian_C + dK_dx * dC_dx + dK_dy * dC_dy
    
    raw_residual = dC_dt + advection - diffusion
    residuals = raw_residual.detach().cpu().numpy().flatten()
    
    std_res = np.std(residuals)
    mean_res = np.mean(residuals)
    
    sources_out = []
    flat_lat = lat_grid.flatten()
    flat_lon = lon_grid.flatten()
    
    for i in range(len(residuals)):
        val = float(residuals[i])
        if val > 2 * std_res:
            intensity = "high"
        elif val > std_res:
            intensity = "medium"
        else:
            intensity = "low"
            
        sources_out.append({
            "lat": float(flat_lat[i]),
            "lon": float(flat_lon[i]),
            "residual": val,
            "intensity_label": intensity
        })
        
    resp = {"sources": sources_out}
    CACHE["sources"]["data"] = resp
    CACHE["sources"]["timestamp"] = now
    
    return resp

@app.get("/api/stations")
async def get_stations():
    now = time.time()
    if now - CACHE["stations"]["timestamp"] < 300 and CACHE["stations"]["data"]:
        return CACHE["stations"]["data"]
        
    url = "https://api.openaq.org/v3/locations?coordinates=28.65,77.23&radius=50000&parameters=pm25&limit=20"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            data = resp.json()
    except Exception as e:
        print(f"OpenAQ fetch failed: {e}")
        data = {"results": []}
        
    stations_out = []
    for loc in data.get("results", []):
        try:
            name = loc.get("name", "Unknown")
            lat = loc["coordinates"]["latitude"]
            lon = loc["coordinates"]["longitude"]
            
            pm25 = 100.0 # Placeholder
            for sens in loc.get("sensors", []):
                if sens["parameter"]["name"] == "pm25":
                    pm25 = sens.get("latest", {}).get("value", 100.0)
                    break
                    
            if pm25 < 50: aqi = "Good"
            elif pm25 < 100: aqi = "Satisfactory"
            elif pm25 < 200: aqi = "Moderate"
            elif pm25 < 300: aqi = "Poor"
            elif pm25 < 400: aqi = "Very Poor"
            else: aqi = "Severe"
            
            stations_out.append({
                "id": loc.get("id"),
                "name": name,
                "lat": lat,
                "lon": lon,
                "pm25_current": pm25,
                "aqi_category": aqi
            })
        except:
            pass
            
    resp = {"stations": stations_out}
    CACHE["stations"]["data"] = resp
    CACHE["stations"]["timestamp"] = now
    return resp

@app.get("/api/forecast")
async def get_forecast(hours: int = 24):
    meteo_data = await fetch_open_meteo()
    if not meteo_data or "hourly" not in meteo_data:
        raise HTTPException(status_code=500, detail="Meteo data unavailable")
        
    lats = np.linspace(BOUNDS["lat_min"], BOUNDS["lat_max"], 10)
    lons = np.linspace(BOUNDS["lon_min"], BOUNDS["lon_max"], 10)
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    
    forecast_out = []
    now_ts = time.time()
    
    for h in range(min(hours, len(meteo_data["hourly"]["time"]))):
        ts = now_ts + h * 3600
        met_features = get_met_features(meteo_data, hour_idx=h)
        X = generate_features_tensor(lat_grid, lon_grid, ts, met_features)
        
        with torch.no_grad():
            preds_norm = c_net(X).numpy().flatten()
            
        preds_phys = preds_norm * SCALERS["pm25"]["std"] + SCALERS["pm25"]["mean"]
        preds_phys = np.clip(preds_phys, 0, 600)
        
        forecast_out.append({
            "hour": h,
            "timestamp": datetime.fromtimestamp(ts).isoformat(),
            "mean_pm25": float(np.mean(preds_phys)),
            "max_pm25": float(np.max(preds_phys)),
            "domain_average": float(np.mean(preds_phys))
        })
        
    return {"forecast": forecast_out}

class EnforceRequest(BaseModel):
    hotspots: List[Dict[str, Any]]
    current_aqi: float
    forecast_aqi: float

@app.post("/api/enforce")
async def post_enforce(req: EnforceRequest):
    prompt = f"""You are an air quality enforcement intelligence system for Delhi NCR.
Given these pollution hotspots detected by a Physics-Informed Neural Network via PDE residual analysis:
{req.hotspots}
Current domain AQI: {req.current_aqi}. Forecast AQI in 24h: {req.forecast_aqi}.
Identify the top 3 enforcement priorities. For each provide:
1. Location description (translate lat/lon to nearest landmark or area name)
2. Likely emission source category (traffic/construction/industrial/waste burning)
3. Specific enforcement action
4. Evidence basis from the PDE residual data
Respond ONLY in JSON matching this exact format: {{"priorities": [{{"location": "...", "source_type": "...", "action": "...", "evidence": "...", "severity": "..."}}]}}"""

    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        return {
            "priorities": [
                {
                    "location": "Dummy Location (API Key Missing)",
                    "source_type": "industrial",
                    "action": "Dispatch inspection team",
                    "evidence": "High PDE residual detected",
                    "severity": "high"
                }
            ]
        }
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={gemini_api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
            text_resp = data["candidates"][0]["content"]["parts"][0]["text"]
            # Clean up markdown JSON formatting if present
            if text_resp.startswith("```json"):
                text_resp = text_resp[7:]
            if text_resp.startswith("```"):
                text_resp = text_resp[3:]
            if text_resp.endswith("```"):
                text_resp = text_resp[:-3]
            return json.loads(text_resp)
    except Exception as e:
        print(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch enforcement priorities")
