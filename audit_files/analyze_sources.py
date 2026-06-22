import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import os
import sys

# Ensure lib can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from lib.utils import load_data, get_device
from lib.model import AirQualityNet, DiffusivityNet, JointPINN
from lib.physics import compute_pde_residual

# Configuration
MODEL_PATH = "Code/models/joint_pinn_checkpoint.pth"
OUTPUT_DIR = "Code/outputs/sources"
DEVICE = get_device()
PDE_SCALING = 1e4 
os.makedirs(OUTPUT_DIR, exist_ok=True)

def analyze():
    X_train, y_train, scales, stats = load_data("data/processed/delhi_season_2023_Q4.csv") 
    
    c_net = AirQualityNet(input_dim=15, hidden_dim=128, num_layers=9, dropout_rate=0.05)
    k_net = DiffusivityNet(input_dim=7, hidden_dim=64, n_layers=3)
    model = JointPINN(c_net, k_net).to(DEVICE)

    if os.path.exists(MODEL_PATH):
        checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
        model.c_net.load_state_dict(checkpoint['c_net_state_dict'])
        model.k_net.load_state_dict(checkpoint['k_net_state_dict'])
        print(f"Loaded JointPINN model from {MODEL_PATH}")
    else:
        print("Checkpoint not found. Running with untrained weights for testing.")
        
    model.eval()
    
    print("Computing PDE Residuals on Training Data...")
    batch_size = 5000
    residuals = []
    
    phys_stats = {
        'pm_std': stats['pm_std'] if 'pm_std' in stats else stats['pm25_std'], 
        'pm_mean': stats['pm_mean'] if 'pm_mean' in stats else stats['pm25_mean'],
        'u_std': stats['u10_std'], 'u_mean': stats['u10_mean'],
        'v_std': stats['v10_std'], 'v_mean': stats['v10_mean'],
        'pblh_std': stats['blh_std'], 'pblh_mean': stats['blh_mean']
    }
    
    total_samples = len(X_train)
    
    def get_residuals(joint_model, scale_k=1.0):
        res_list = []
        for i in range(0, total_samples, batch_size):
            batch = X_train[i:i+batch_size].to(DEVICE)
            
            x_norm_c = batch[:, 0:1].detach().requires_grad_(True)
            y_norm_c = batch[:, 1:2].detach().requires_grad_(True)
            t_norm_c = batch[:, 2:3].detach().requires_grad_(True)
            
            x_colloc_grad = torch.cat([x_norm_c, y_norm_c, t_norm_c, batch[:, 3:]], dim=1)
            c_pred_colloc = joint_model.predict_concentration(x_colloc_grad)
            
            x_met_grad = torch.cat([x_norm_c, y_norm_c, t_norm_c, batch[:, 3:7]], dim=1)
            K_pred = joint_model.predict_diffusivity(x_met_grad) * scale_k
            
            u10_phys = batch[:, 3:4] * phys_stats['u_std'] + phys_stats['u_mean']
            v10_phys = batch[:, 4:5] * phys_stats['v_std'] + phys_stats['v_mean']
            
            L_x = float(scales['L_x'])
            L_y = float(scales['L_y'])
            L_t = float(scales['L_t'])
            c_std = float(phys_stats['pm_std'])
            
            res = compute_pde_residual(
                c_pred_colloc, x_norm_c, y_norm_c, t_norm_c, 
                u10_phys, v10_phys, K_pred, 
                c_std, L_x, L_y, L_t, PDE_SCALING
            )
            
            # extract raw tensor without sum, since compute_pde returns mean of squared
            # We want the ACTUAL residual value, not the squared sum
            # Wait, compute_pde_residual returns a single scalar loss!
            # Let's rebuild the raw residual inside here for maps
            # (or we just adapt compute_pde_residual, but easier to do inline for analysis maps)
            
            # --- Temporal ---
            dC_dt = torch.autograd.grad(c_pred_colloc, t_norm_c, torch.ones_like(c_pred_colloc), create_graph=True)[0] * (c_std / L_t)
            # --- Spatial ---
            dC_dx = torch.autograd.grad(c_pred_colloc, x_norm_c, torch.ones_like(c_pred_colloc), create_graph=True)[0] * (c_std / L_x)
            dC_dy = torch.autograd.grad(c_pred_colloc, y_norm_c, torch.ones_like(c_pred_colloc), create_graph=True)[0] * (c_std / L_y)
            # --- Advection ---
            advection = u10_phys * dC_dx + v10_phys * dC_dy
            # --- Diffusion ---
            d2C_dx2 = torch.autograd.grad(dC_dx, x_norm_c, torch.ones_like(dC_dx), create_graph=True)[0] * (c_std / L_x**2)
            d2C_dy2 = torch.autograd.grad(dC_dy, y_norm_c, torch.ones_like(dC_dy), create_graph=True)[0] * (c_std / L_y**2)
            laplacian_C = d2C_dx2 + d2C_dy2
            
            dK_dx = torch.autograd.grad(K_pred, x_norm_c, torch.ones_like(K_pred), create_graph=True)[0] / L_x
            dK_dy = torch.autograd.grad(K_pred, y_norm_c, torch.ones_like(K_pred), create_graph=True)[0] / L_y
            
            diffusion = K_pred * laplacian_C + dK_dx * dC_dx + dK_dy * dC_dy
            
            # PDE Residual: R = dC/dt + u·∇C - ∇·(K∇C)
            raw_residual = dC_dt + advection - diffusion
            res_list.append(raw_residual.detach().cpu().numpy())
            
        return np.concatenate(res_list).flatten()
        
    residuals = get_residuals(model, scale_k=1.0)
    
    df_res = pd.DataFrame({
        'x_norm': X_train[:, 0].cpu().numpy(),
        'y_norm': X_train[:, 1].cpu().numpy(),
        't_norm': X_train[:, 2].cpu().numpy(),
        'residual': residuals
    })
    
    df_res['source_strength'] = df_res['residual'].apply(lambda x: max(0, x))
    
    print("Generating Persistent Source Map...")
    plt.figure(figsize=(10, 8))
    hb = plt.hexbin(df_res['x_norm'], df_res['y_norm'], C=df_res['source_strength'], 
               gridsize=50, cmap='inferno', reduce_C_function=np.mean)
    plt.colorbar(hb, label='Mean Source Strength (+Residual)')
    plt.title(f"Persistent Emission Sources (PINN Inverse ID)")
    plt.xlabel("Normalized Longitude")
    plt.ylabel("Normalized Latitude")
    plt.savefig(f"{OUTPUT_DIR}/persistent_source_map.png")
    plt.close()
    
    print("Generating Source Timeline...")
    df_res['time_bin'] = pd.cut(df_res['t_norm'], bins=61, labels=False)
    timeline = df_res.groupby('time_bin')['source_strength'].sum()
    
    plt.figure(figsize=(12, 5))
    plt.plot(timeline.index, timeline.values, color='firebrick', linewidth=2)
    plt.title("Total Estimated Emission Intensity over Time")
    plt.xlabel("Time (Bins)")
    plt.ylabel("Integrated Source Strength")
    plt.grid(True, alpha=0.3)
    plt.savefig(f"{OUTPUT_DIR}/source_timeline.png")
    plt.close()
    
    # ============================================================
    # K SENSITIVITY ANALYSIS
    # Tests whether the source identification map changes when K is scaled.
    # ============================================================
    print("\n=== K Sensitivity Analysis ===")

    K_SCALES = [0.1, 0.5, 1.0, 2.0, 10.0]
    source_maps = {}

    for scale in K_SCALES:
        res = get_residuals(model, scale_k=scale)
        source_maps[scale] = np.maximum(0, res)

    baseline = source_maps[1.0]
    print(f"\n{'K Scale':>10} | {'Pearson r vs baseline':>22}")
    print("-" * 35)
    for scale in K_SCALES:
        from scipy.stats import pearsonr
        r, _ = pearsonr(baseline, source_maps[scale])
        print(f"{scale:>10.1f} | {r:>22.4f}")

    print("\nInterpretation: r > 0.90 across all scales = robust source identification")
    print("                r < 0.80 at 0.1x or 10x  = K uncertainty dominates results (dangerous)")

if __name__ == "__main__":
    analyze()
