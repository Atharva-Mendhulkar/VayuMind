"""
PINN Inference Script
Generates PM2.5 maps using the trained model and saved scale statistics.
"""

import torch
import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt
import seaborn as sns
from lib.model import AirQualityNet
from lib.physics import compute_pde_residual
from lib.utils import generate_cyclic_features, get_device, DATA_FILE

# Configuration
DATA_FILE = "data/processed/delhi_season_2023_Q4.csv"
MODEL_PATH = "models/pinn_delhi_final.pth"
STATS_PATH = "models/training_stats.json"
OUTPUT_DIR = "outputs/inference"
MC_SAMPLES = 50  # Number of passes for uncertainty

def load_resources():
    # Load Stats
    with open(STATS_PATH, "r") as f:
        data = json.load(f)
        stats = data["stats"]
        scales = data["scales"]
        
    # Load Model (15 inputs)
    # Enable dropout for MC Uncertainty logic handled in inference loop
    model = AirQualityNet(input_dim=15, hidden_dim=128, num_layers=9, dropout_rate=0.05)
    model.load_state_dict(torch.load(MODEL_PATH))
    # Note: We will toggle dropout manually later
    model.eval()
    
    return model, stats, scales

def create_inference_grid(n_grid=100):
    """
    Create a spatial grid for a specific fixed time (e.g., t=0 or midway).
    """
    # Grid [-1, 1] for x and y
    x = np.linspace(-1, 1, n_grid)
    y = np.linspace(-1, 1, n_grid)
    xx, yy = np.meshgrid(x, y)
    
    # Flatten
    flat_x = xx.flatten()
    flat_y = yy.flatten()
    N = len(flat_x)
    
    # Assemble Feature Vector (15 dims)
    # 1. Spatiotemporal
    # Arbitrary time t=0 (start of season)
    t_fixed = np.zeros(N) 
    
    # 2. Meteo (Use mean values from stats as placeholder)
    u_norm = np.zeros(N)
    v_norm = np.zeros(N)
    t2m_norm = np.zeros(N)
    blh_norm = np.zeros(N)
    
    # 3. Cyclic (Time = 0)
    h_sin = np.sin(2 * np.pi * 0 / 24) * np.ones(N)
    h_cos = np.cos(2 * np.pi * 0 / 24) * np.ones(N)
    d_sin = np.sin(2 * np.pi * 0 / 365) * np.ones(N)
    d_cos = np.cos(2 * np.pi * 0 / 365) * np.ones(N)
    # DOW (Monday=0)
    dow = np.zeros(N)
    
    # 4. Static (Synthetic)
    dist = np.sqrt(flat_x**2 + flat_y**2)
    urban_flag = (dist < 0.4).astype(float) 
    
    elevation_norm = np.zeros(N) 
    dist_to_road_norm = np.zeros(N) 
    
    # Concatenate
    features = np.stack([
        flat_x, flat_y, t_fixed,
        u_norm, v_norm, t2m_norm, blh_norm,
        h_sin, h_cos, d_sin, d_cos, dow,
        elevation_norm, urban_flag, dist_to_road_norm
    ], axis=1)
    
    return torch.tensor(features, dtype=torch.float32), xx, yy

def enable_dropout(model):
    """Enable dropout layers during test-time."""
    for m in model.modules():
        if m.__class__.__name__.startswith('Dropout'):
            m.train()

def run_inference():
    import os
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("Loading model...")
    try:
        model, stats, scales = load_resources()
    except FileNotFoundError:
        print("Error: Model or stats not found. Please run training first.")
        return

    print("Generating grid...")
    X_grid, xx, yy = create_inference_grid(n_grid=100)
    
    # --- 1. MC Dropout Inference ---
    print(f"Running MC Inference ({MC_SAMPLES} samples)...")
    enable_dropout(model)
    
    predictions = []
    with torch.no_grad():
        for i in range(MC_SAMPLES):
            pred = model(X_grid).numpy().flatten()
            predictions.append(pred)
            
    predictions = np.array(predictions) # Shape: (MC_SAMPLES, N_grid)
    
    # Compute Statistics per pixel
    mean_pred_norm = np.mean(predictions, axis=0) # Mean
    std_pred_norm = np.std(predictions, axis=0)   # Uncertainty
    
    # Denormalize
    pm_mean = stats["pm_mean"]
    pm_std = stats["pm_std"]
    
    mean_pred_phys = mean_pred_norm * pm_std + pm_mean
    std_pred_phys = std_pred_norm * pm_std # Scaling std dev only by scale factor
    
    # Reshape for plotting
    grid_shape = xx.shape
    Z_mean = mean_pred_phys.reshape(grid_shape)
    Z_std = std_pred_phys.reshape(grid_shape)
    
    # --- 2. PDE Residual Validation ---
    print("Computing Physics Residuals...")
    # For derivatives, we need a standard forward pass with gradients enabled
    model.eval() # Disable dropout for deterministic derivative calculation
    
    # Prepare batch for Autograd
    # We need to recreate tensor with requires_grad=True
    X_pde = X_grid.clone().detach().requires_grad_(True)
    
    # Call physics function
    # Note: compute_pde_residual signature: (model, x, scales, stats)
    # It extracts u,v,pblh internally from X !!
    
    residual_tens = compute_pde_residual(model, X_pde, scales, stats)
    residual_grid = residual_tens.detach().numpy().reshape(grid_shape)
    
    # --- 3. Visualization ---
    print("Plotting results...")
    
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    
    # Plot 1: Mean Prediction
    im1 = axes[0].contourf(xx, yy, Z_mean, levels=50, cmap='viridis')
    plt.colorbar(im1, ax=axes[0], label=r'PM2.5 ($\mu g/m^3$)')
    axes[0].set_title('Mean Predicted PM2.5 (Consensus)')
    axes[0].set_xlabel('Normalized Longitude')
    axes[0].set_ylabel('Normalized Latitude')
    
    # Plot 2: Uncertainty (Std Dev)
    im2 = axes[1].contourf(xx, yy, Z_std, levels=50, cmap='inferno')
    plt.colorbar(im2, ax=axes[1], label=r'Uncertainty (1$\sigma$)')
    axes[1].set_title('Prediction Uncertainty (MC Dropout)')
    axes[1].set_xlabel('Normalized Longitude')
    
    # Plot 3: Physics Residual
    # Residual = Source. We plot raw value (positive = source, negative = sink)
    # But usually sources are positive. Let's plot raw with divergent map.
    div_norm = plt.Normalize(vmin=-np.max(np.abs(residual_grid)), vmax=np.max(np.abs(residual_grid)))
    im3 = axes[2].contourf(xx, yy, residual_grid, levels=50, cmap='RdBu_r', norm=div_norm)
    plt.colorbar(im3, ax=axes[2], label='Residual (Source > 0, Sink < 0)')
    axes[2].set_title('PDE Residual (Estimated Sources)')
    axes[2].set_xlabel('Normalized Longitude')
    
    # --- 4. Wind Vector Overlay (New) ---
    # We used u_norm=0, v_norm=0 for prediction (Mean Wind conditions)
    # Recover physical mean wind
    u_mean_phys = stats['u_mean']
    v_mean_phys = stats['v_mean']
    
    # Create valid grid for quiver (subsample for clarity)
    skip = (slice(None, None, 10), slice(None, None, 10))
    x_q, y_q = xx[skip], yy[skip]
    u_q = np.ones_like(x_q) * u_mean_phys
    v_q = np.ones_like(y_q) * v_mean_phys
    
    # Overlay on Plot 1 (Mean Prediction)
    axes[0].quiver(x_q, y_q, u_q, v_q, color='white', alpha=0.5, scale=50)
    axes[0].text(0.05, 0.95, f"Mean Wind: ({u_mean_phys:.1f}, {v_mean_phys:.1f}) m/s", 
                 transform=axes[0].transAxes, color='white', fontsize=9, fontweight='bold')

    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/detailed_metrics.png", dpi=150)
    print(f"Saved detailed metrics to {OUTPUT_DIR}/detailed_metrics.png")

def evaluate_model_fit(model, stats):
    """Evaluate against the training data to show fit quality."""
    print("Evaluating against observed data...")
    df = pd.read_csv(DATA_FILE)
    df = df[(df["pm25"] >= 0) & (df["pm25"] <= 600)].dropna().reset_index(drop=True)
    
    # Normalization (must match train.py exactly)
    df = generate_cyclic_features(df)
    
    # Time norm
    t_min = df['timestamp_x'].min()
    total_seconds = (df['timestamp_x'].max() - t_min).total_seconds()
    df['t_norm'] = (df['timestamp_x'] - t_min).dt.total_seconds() / total_seconds
    df['t_norm'] = 2 * df['t_norm'] - 1
    
    # Space norm
    lon_min, lon_max = df['lon'].min(), df['lon'].max()
    lat_min, lat_max = df['lat'].min(), df['lat'].max()
    df['x_norm'] = 2 * (df['lon'] - lon_min) / (lon_max - lon_min) - 1
    df['y_norm'] = 2 * (df['lat'] - lat_min) / (lat_max - lat_min) - 1
    
    # Z-score norm for aux
    norm_cols = ['u10', 'v10', 't2m', 'blh', 'elevation', 'dist_to_road']
    # Note: We must use the SAVED stats to normalize, not re-calculate!
    # Because the model learned the weights based on training mean/std.
    # Stats dict keys: 'u_mean', 'u_std', etc.
    # Need to map column names to stats keys.
    # Mapping in train.py:
    # 'u_mean' <- stats['u10_mean']
    # But json only saved the 'phys_stats' subset!
    # Wait, train.py lines 246:
    # serializable_stats = {k: float(v) for k, v in phys_stats.items()}
    # phys_stats keys: 'pm_std', 'pm_mean', 'u_std', ...
    # It does NOT save 't2m_mean', 'elevation_mean', etc.
    # CRITICAL: We cannot perfectly reproduce normalization for all auxiliary vars if we didn't save their stats.
    # train.py line 246 ONLY SAVED phys_stats!
    # This is a BUG in train.py (or a limitation). 
    # Workaround: Re-calculate stats from data (assuming same data file).
    # Since we are loading the SAME data file, pandas mean()/std() will be identical.
    
    # Recalculate stats
    local_stats = {}
    for col in norm_cols + ['pm25']:
        mean = df[col].mean()
        std = df[col].std() + 1e-6
        df[f'{col}_norm'] = (df[col] - mean) / std
        local_stats[f'{col}_mean'] = mean
        local_stats[f'{col}_std'] = std
        
    # Feature Vector
    feature_cols = [
        'x_norm', 'y_norm', 't_norm', 
        'u10_norm', 'v10_norm', 't2m_norm', 'blh_norm',
        'hour_sin', 'hour_cos', 'doy_sin', 'doy_cos', 
        'dow', 
        'elevation_norm', 'urban_flag', 'dist_to_road_norm'
    ]
    
    X = torch.tensor(df[feature_cols].values, dtype=torch.float32)
    y_true = df['pm25'].values
    
    # Predict
    model.eval()
    with torch.no_grad():
        y_pred_norm = model(X).numpy().flatten()
        
    # Denormalize
    # Use re-calculated stats for consistency with how X was normalized here
    pm_mean = local_stats['pm25_mean']
    pm_std = local_stats['pm25_std']
    y_pred = y_pred_norm * pm_std + pm_mean
    
    # Validation Metric
    mse = np.mean((y_true - y_pred)**2)
    mae = np.mean(np.abs(y_true - y_pred))
    r2 = 1 - (np.sum((y_true - y_pred)**2) / np.sum((y_true - np.mean(y_true))**2))
    
    print(f"Validation Results: RMSE={np.sqrt(mse):.2f}, MAE={mae:.2f}, R2={r2:.3f}")
    
    # Plot
    plt.figure(figsize=(6, 6))
    plt.scatter(y_true, y_pred, alpha=0.1, s=2)
    plt.plot([0, 500], [0, 500], 'r--', label='Ideal')
    plt.xlabel('Observed PM2.5')
    plt.ylabel('Predicted PM2.5')
    plt.title(f'Model Fit (R2={r2:.2f})')
    plt.legend()
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/model_fit.png", dpi=120)
    print(f"Saved fit plot to {OUTPUT_DIR}/model_fit.png")


def run_inference():
    import os
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("Loading model...")
    try:
        model, stats, scales = load_resources()
    except FileNotFoundError:
        print("Error: Model or stats not found. Please run training first.")
        return

    # 1. Evaluate on Real Data
    evaluate_model_fit(model, stats)

    print("Generating grid...")
    X_grid, xx, yy = create_inference_grid(n_grid=100)
    
    # --- 2. MC Dropout Inference ---
    print(f"Running MC Inference ({MC_SAMPLES} samples)...")
    enable_dropout(model)
    
    predictions = []

if __name__ == "__main__":
    run_inference()
