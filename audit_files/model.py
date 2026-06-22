"""
PINN Model Architecture for Ghaziabad PM2.5 Neural Field

Defines:
- AirQualityNet (C-Net): 9-input coordinate neural field with deterministic/stochastic dropout separation.
- DiffusivityNet (K-Net): Dynamic diffusivity field bounded to [0.1, 500] m²/s.
- JointPINN: Unified model container.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

class AirQualityNet(nn.Module):
    """
    Physics-Informed Neural Field for PM2.5 Reconstruction.
    
    Architecture (Phase 2):
      Input (9) -> [Linear(128) -> Tanh] x 6 -> Linear(1) -> Output
      
    Inputs (9 normalized):
      x_norm, y_norm, t_norm, u10_norm, v10_norm, t2m_norm, blh_norm, doy_sin, doy_cos
    """
    def __init__(self, input_dim=9, hidden_dim=128, num_layers=6, dropout_p=0.05):
        super().__init__()
        self.dropout_p = dropout_p
        
        # Build core sequential layers WITHOUT nn.Dropout inside
        layers = [nn.Linear(input_dim, hidden_dim), nn.Tanh()]
        for _ in range(num_layers - 1):
            layers.append(nn.Linear(hidden_dim, hidden_dim))
            layers.append(nn.Tanh())
        layers.append(nn.Linear(hidden_dim, 1))
        self.net = nn.Sequential(*layers)
        
        # Separate dropout module applied externally when use_dropout=True
        self.dropout = nn.Dropout(p=dropout_p)
        
        # Xavier uniform initialization
        self._init_weights()
        
    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
                    
    def forward(self, x, use_dropout=False):
        """
        use_dropout=False: Deterministic forward pass (PDE gradients, training data loss, evaluation)
        use_dropout=True: Stochastic forward pass (Monte Carlo uncertainty estimation)
        """
        if use_dropout:
            h = x
            for i, layer in enumerate(self.net):
                h = layer(h)
                if isinstance(layer, nn.Tanh) and i < len(self.net) - 2:
                    h = self.dropout(h)
            return h
        else:
            return self.net(x)

class DiffusivityNet(nn.Module):
    """
    Learned dynamic diffusivity field K(x, y, t).
    
    Input (7-dim): x_norm, y_norm, t_norm, u10_norm, v10_norm, t2m_norm, blh_norm
    Output: K in m²/s bounded strictly to [0.1, 500.0]
    """
    K_MIN = 0.1    # Stable nocturnal inversion minimum
    K_MAX = 500.0  # Convective afternoon boundary layer maximum
    
    def __init__(self, input_dim=7, hidden_dim=64, n_layers=3):
        super().__init__()
        layers = []
        in_features = input_dim
        for _ in range(n_layers):
            layers.append(nn.Linear(in_features, hidden_dim))
            layers.append(nn.Tanh())
            in_features = hidden_dim
            
        layers.append(nn.Linear(hidden_dim, 1))
        self.net = nn.Sequential(*layers)
        
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                nn.init.zeros_(m.bias)
                
    def forward(self, x_met):
        """
        x_met: [N, 7] tensor
        Returns: K in m²/s, shape [N, 1]
        """
        raw = self.net(x_met)
        K_phys = self.K_MIN + (self.K_MAX - self.K_MIN) * torch.sigmoid(raw)
        return K_phys

class JointPINN(nn.Module):
    def __init__(self, c_net: AirQualityNet, k_net: DiffusivityNet):
        super().__init__()
        self.c_net = c_net
        self.k_net = k_net
        
    def forward(self, x_full, x_met, use_dropout=False):
        C_pred = self.c_net(x_full, use_dropout=use_dropout)
        K_pred = self.k_net(x_met)
        return C_pred, K_pred
