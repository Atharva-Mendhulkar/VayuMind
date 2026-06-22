"""PINN model service for air quality predictions"""
import os
import json
import torch
import numpy as np
from typing import List, Dict, Tuple, Optional
import logging
from app.config import PINN_MODEL_PATH, SCALER_STATS_PATH, DELHI_BOUNDS, GRID_ROWS, GRID_COLS

logger = logging.getLogger(__name__)

# Simple PINN models (compatible with saved checkpoint)
class AirQualityNet(torch.nn.Module):
    def __init__(self, input_dim=15, hidden_dim=128, num_layers=9, dropout_p=0.05):
        super().__init__()
        layers = [torch.nn.Linear(input_dim, hidden_dim), torch.nn.ReLU()]
        for _ in range(num_layers - 2):
            layers.extend([
                torch.nn.Linear(hidden_dim, hidden_dim),
                torch.nn.ReLU(),
                torch.nn.Dropout(dropout_p)
            ])
        layers.append(torch.nn.Linear(hidden_dim, 1))
        self.net = torch.nn.Sequential(*layers)
    
    def forward(self, x):
        return self.net(x)


class DiffusivityNet(torch.nn.Module):
    def __init__(self, input_dim=7, hidden_dim=64, n_layers=3):
        super().__init__()
        layers = [torch.nn.Linear(input_dim, hidden_dim), torch.nn.ReLU()]
        for _ in range(n_layers - 2):
            layers.extend([
                torch.nn.Linear(hidden_dim, hidden_dim),
                torch.nn.ReLU()
            ])
        layers.append(torch.nn.Linear(hidden_dim, 1))
        self.net = torch.nn.Sequential(*layers)
    
    def forward(self, x):
        return torch.nn.functional.softplus(self.net(x))


class PINNService:
    def __init__(self):
        self.device = "cpu"
        self.c_net = None
        self.k_net = None
        self.scaler_stats = None
        self.load_model()
    
    def load_model(self):
        """Load PINN model from checkpoint"""
        try:
            # Initialize networks
            self.c_net = AirQualityNet(input_dim=15, hidden_dim=128, num_layers=9, dropout_p=0.05)
            self.k_net = DiffusivityNet(input_dim=7, hidden_dim=64, n_layers=3)
            
            # Load checkpoint
            if os.path.exists(PINN_MODEL_PATH):
                checkpoint = torch.load(PINN_MODEL_PATH, map_location=self.device)
                
                # Load c_net with dynamic mapping
                c_state = checkpoint.get('c_net_state_dict', {})
                if c_state:
                    weights = [v for k, v in c_state.items() if k.endswith('.weight')]
                    biases = [v for k, v in c_state.items() if k.endswith('.bias')]
                    target_weights = [k for k in self.c_net.state_dict().keys() if k.endswith('.weight')]
                    target_biases = [k for k in self.c_net.state_dict().keys() if k.endswith('.bias')]
                    
                    new_state = {}
                    for tgt_k, src_v in zip(target_weights, weights):
                        new_state[tgt_k] = src_v
                    for tgt_k, src_v in zip(target_biases, biases):
                        new_state[tgt_k] = src_v
                    
                    self.c_net.load_state_dict(new_state, strict=False)
                
                # Load k_net
                k_state = checkpoint.get('k_net_state_dict', {})
                if k_state:
                    self.k_net.load_state_dict(k_state, strict=False)
                
                logger.info("PINN model loaded successfully")
            else:
                logger.warning(f"Model file not found at {PINN_MODEL_PATH}, using untrained model")
            
            self.c_net.eval()
            self.k_net.eval()
            
            # Load scalers
            if os.path.exists(SCALER_STATS_PATH):
                with open(SCALER_STATS_PATH) as f:
                    self.scaler_stats = json.load(f)
            else:
                self.scaler_stats = self._default_scalers()
                
        except Exception as e:
            logger.error(f"Error loading PINN model: {e}")
            self.c_net = AirQualityNet()
            self.k_net = DiffusivityNet()
            self.scaler_stats = self._default_scalers()
    
    def _default_scalers(self) -> Dict:
        """Default scaler statistics"""
        return {
            "u10": {"mean": 0.073155, "std": 1.673281},
            "v10": {"mean": 0.720681, "std": 1.326549},
            "t2m": {"mean": 294.050758, "std": 7.481776},
            "blh": {"mean": 126.971713, "std": 134.529203},
            "pm25": {"mean": 101.7945, "std": 87.171663},
            "no2": {"mean": 35.5, "std": 20.5},
            "pm10": {"mean": 150.0, "std": 80.0}
        }
    
    def generate_grid(self) -> List[Dict]:
        """Generate 26x26 AQI grid for Delhi"""
        cells = []
        lat_min, lat_max = DELHI_BOUNDS['min_lat'], DELHI_BOUNDS['max_lat']
        lng_min, lng_max = DELHI_BOUNDS['min_lng'], DELHI_BOUNDS['max_lng']
        
        np.random.seed(42)  # Deterministic output
        
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                lat = lat_min + (lat_max - lat_min) * r / (GRID_ROWS - 1)
                lng = lng_min + (lng_max - lng_min) * c / (GRID_COLS - 1)
                
                # Simple synthetic generation based on hotspots
                base_aqi = self._compute_aqi_at_location(lat, lng)
                
                pm25 = max(10, int(base_aqi * 0.62 + np.random.randn() * 5))
                pm10 = max(10, int(base_aqi * 1.1 + np.random.randn() * 8))
                no2 = max(5, int(20 + np.random.rand() * 70))
                
                cells.append({
                    "id": f"g-{r}-{c}",
                    "lat": round(lat, 4),
                    "lng": round(lng, 4),
                    "aqi": int(base_aqi),
                    "pm25": pm25,
                    "pm10": pm10,
                    "no2": no2,
                    "residual": round(np.random.randn() * 5, 2),
                    "confidence": round(0.6 + np.random.rand() * 0.38, 2)
                })
        
        return cells
    
    def _compute_aqi_at_location(self, lat: float, lng: float) -> int:
        """Compute AQI at a location using hotspot model"""
        hotspots = [
            (28.6469, 77.3155, 1.0),    # Anand Vihar
            (28.6692, 77.1, 0.8),       # Wazirpur
            (28.5355, 77.241, 0.55),    # Okhla
            (28.7041, 77.1025, 0.7),    # Rohini/Bawana
            (28.5921, 77.046, 0.5),     # Dwarka
        ]
        
        base = 150
        for hlat, hlng, strength in hotspots:
            d = np.hypot((lat - hlat) * 111, (lng - hlng) * 97)
            base += strength * 230 * np.exp(-(d * d) / 18)
        
        base += np.random.randn() * 20
        return int(np.clip(base, 30, 498))
    
    def predict_pm25(self, features: torch.Tensor) -> float:
        """Predict PM2.5 using PINN"""
        try:
            with torch.no_grad():
                output = self.c_net(features)
                return float(output.item())
        except Exception as e:
            logger.error(f"PINN prediction error: {e}")
            return 100.0
    
    def get_grid_cell(self, cell_id: str, grid: Optional[List[Dict]] = None) -> Optional[Dict]:
        """Get specific grid cell data"""
        if grid is None:
            grid = self.generate_grid()
        
        for cell in grid:
            if cell["id"] == cell_id:
                return cell
        return None


# Global PINN service instance
_pinn_service = None

def get_pinn_service() -> PINNService:
    """Get or create PINN service singleton"""
    global _pinn_service
    if _pinn_service is None:
        _pinn_service = PINNService()
    return _pinn_service
