

<p align="center">
  
<div align="center">

# VayuMind

### AI-Powered Urban Air Quality Intelligence Platform

<br>

![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi)
![PyTorch](https://img.shields.io/badge/PyTorch-Deep%20Learning-EE4C2C?style=for-the-badge&logo=pytorch)
![NumPy](https://img.shields.io/badge/NumPy-Scientific%20Computing-013243?style=for-the-badge&logo=numpy)
![JointPINN](https://img.shields.io/badge/PINN-JointPINN%20v8-orange?style=for-the-badge)
![R²](https://img.shields.io/badge/R²-0.9049-success?style=for-the-badge)

</div>

</p>

<p align="center">
  <b>Physics-Informed Source Attribution • Hyperlocal Forecasting • Enforcement Intelligence</b>
</p>

---

# Overview

VayuMind is an AI-powered municipal operating system for air quality intervention.

Unlike traditional AQI dashboards that only visualize pollution levels, VayuMind uses Physics-Informed Neural Networks (PINNs) to reconstruct atmospheric pollution fields, identify emission hotspots, forecast future AQI, prioritize enforcement actions, and generate multilingual citizen advisories.

### Core Question

Most systems answer:

> How polluted is the air?

VayuMind answers:

> Where is the pollution coming from, what will happen next, and what action should be taken right now?

---

# The Problem

India loses over **1.67 million lives annually** due to air pollution.

Despite:

- 900+ CAAQMS monitoring stations
- National Clean Air Programme (NCAP)
- State Pollution Control Boards
- Smart City Initiatives

Cities still lack:

- Source Attribution
- Hyperlocal Forecasting
- Enforcement Intelligence
- Intervention Planning
- Citizen Response Automation

Current systems provide measurements.

VayuMind provides intelligence.

---

# Key Innovation

## Physics-Informed Source Attribution

Instead of treating pollution forecasting as a black-box machine learning problem, VayuMind solves the atmospheric transport equation:

```math
\frac{\partial C}{\partial t}
+
u \cdot \nabla C
=
\nabla \cdot (K \nabla C)
+
S(x,y,t)
```

Where:

| Symbol | Meaning |
|----------|------------|
| C | PM2.5 Concentration |
| u | Wind Velocity |
| K | Turbulent Diffusivity |
| S | Emission Source Term |

The source term becomes a real-time pollution hotspot map.

---

# Product Modules

| Module | Capability |
|----------|------------|
| PINN Intelligence Layer | Real-time source attribution |
| Forecast Layer | 24–72 hour AQI forecasting |
| Enforcement Intelligence | Inspection prioritization |
| Citizen Intelligence | Multilingual health advisories |
| City Command Center | Unified municipal dashboard |

---

# System Architecture

```mermaid
graph TB

    subgraph External Data Sources
        A[CAAQMS Sensors]
        B[ERA5 Weather]
        C[IMD Forecasts]
        D[MODIS AOD]
        E[GIS Layers]
    end

    subgraph Ingestion Layer
        F[Data Fusion Agent]
    end

    subgraph AI Core
        G[JointPINN v8]
        H[Forecast Engine]
        I[EPS Engine]
        J[Citizen Advisory Engine]
    end

    subgraph Storage
        K[(PostGIS)]
        L[(Redis)]
        M[(Object Storage)]
    end

    subgraph Applications
        N[Command Center]
        O[Inspector PWA]
        P[Citizen Portal]
    end

    A --> F
    B --> F
    C --> F
    D --> F
    E --> F

    F --> G

    G --> H
    G --> I

    H --> I
    H --> J

    G --> K
    H --> K

    K --> N
    K --> O
    K --> P

    L --> N
```

---

# Multi-Agent Architecture

```mermaid
graph LR

    O[Orchestrator Agent]

    D[Data Fusion Agent]
    S[Source Attribution Agent]
    F[Forecast Agent]
    E[Enforcement Agent]
    C[Citizen Advisory Agent]
    M[Monitoring Agent]

    O --> D
    O --> S
    O --> F
    O --> E
    O --> C
    O --> M

    D --> S
    D --> F

    S --> E
    S --> C

    F --> E
    F --> C
```

---

# PINN Inference Pipeline

```mermaid
flowchart LR

    A[CAAQMS Data]
    B[ERA5 Weather]
    C[GIS Features]

    A --> D[Feature Engineering]
    B --> D
    C --> D

    D --> E[AirQualityNet]

    D --> F[DiffusivityNet]

    E --> G[PM2.5 Field]

    E --> H[PDE Residual Solver]

    F --> H

    H --> I[Source Attribution Map]
```

---

# City Intelligence Workflow

```mermaid
sequenceDiagram

    participant Sensor
    participant Fusion
    participant PINN
    participant Forecast
    participant Enforcement
    participant Citizen

    Sensor->>Fusion: PM2.5 Readings
    Fusion->>PINN: Clean Feature Vector

    PINN->>Forecast: PM2.5 Field
    PINN->>Enforcement: Source Map

    Forecast->>Enforcement: AQI Forecast

    Enforcement->>Citizen: Alerts

    Citizen->>Citizen: Advisory Generation
```

---

# Tech Stack

## Frontend

<p align="left">
<img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind" />
</p>

- Next.js 15
- TypeScript
- Tailwind CSS
- Leaflet
- MapLibre
- Recharts

---

## Backend

<p align="left">
<img src="https://skillicons.dev/icons?i=python,fastapi,redis,postgres,docker" />
</p>

- FastAPI
- Celery
- Redis
- PostgreSQL
- PostGIS
- TimescaleDB

---

## AI / ML

<p align="left">
<img src="https://skillicons.dev/icons?i=pytorch" />
</p>

- PyTorch
- JointPINN v8
- Gemini
- NumPy
- Physics-Informed Neural Networks

---

## DevOps & Monitoring

<p align="left">
<img src="https://skillicons.dev/icons?i=docker,grafana,prometheus" />
</p>

- Docker Compose
- Prometheus
- Grafana
- OpenTelemetry

---

# Architecture Components

## PINN Intelligence Layer

### Responsibilities

- PM2.5 Field Reconstruction
- Source Attribution
- Diffusivity Estimation
- Uncertainty Quantification

### Performance

| Metric | Value |
|----------|--------|
| Rolling R² | 0.8902 |
| Holdout R² | 0.9049 |
| PDE Compliance | 100% |
| Forward Pass | 0.46 ms |
| Source Attribution | 3.38 ms |

---

## Forecast Layer

### Capabilities

- 24h Forecast
- 48h Forecast
- 72h Forecast
- Extreme Event Detection
- AQI Deterioration Alerts

### Outputs

- Forecast Grid
- AQI Categories
- Uncertainty Bands
- Extreme Event Warnings

---

## Enforcement Intelligence

### Enforcement Priority Score (EPS)

```text
EPS =
0.30 × Source Intensity
+ 0.25 × Forecast Deterioration
+ 0.20 × Population Exposure
+ 0.15 × Violation History
+ 0.10 × Sensitive Receptors
```

### Outputs

- Ranked Enforcement Queue
- Mobile Inspection Brief
- Impact Estimation
- Enforcement ROI

---

## Citizen Intelligence

### Features

- 12 Indian Languages
- WhatsApp Advisories
- School Safety Protocols
- Outdoor Worker Alerts
- Vulnerability Mapping

### Supported Languages

- English
- Hindi
- Marathi
- Tamil
- Telugu
- Bengali
- Gujarati
- Kannada
- Malayalam
- Punjabi
- Assamese
- Odia

---

# Project Structure

```bash
VayuMind

├── frontend
│   ├── app
│   ├── components
│   ├── hooks
│   └── lib
│
├── services
│   ├── api_gateway
│   ├── pinn_serving
│   ├── forecast_service
│   ├── enforcement_service
│   ├── advisory_service
│   └── agents
│
├── infrastructure
│   ├── docker
│   ├── monitoring
│   └── scripts
│
├── models
│   ├── pinn_delhi_final.pth
│   └── scaler_stats.json
│
├── docs
│
└── docker-compose.yml
```

---

# Database Architecture

```mermaid
erDiagram

cities ||--o{ sensor_readings : contains
cities ||--o{ source_maps : generates
cities ||--o{ ward_advisories : publishes

enforcement_sites ||--o{ enforcement_scores : receives
enforcement_sites ||--o{ violation_records : owns
```

---

# API Overview

## PINN Service

```http
POST /api/v1/pinn/predict
POST /api/v1/pinn/source_attribution
GET  /api/v1/pinn/field/{timestamp}
GET  /api/v1/pinn/health
```

## Forecast Service

```http
GET  /api/v1/forecast/{city}/{horizon}
POST /api/v1/forecast/ward
```

## Enforcement Service

```http
GET  /api/v1/enforcement/queue
GET  /api/v1/enforcement/brief
POST /api/v1/enforcement/outcome
```

## Citizen Service

```http
GET  /api/v1/citizen/advisory
GET  /api/v1/citizen/vulnerability
POST /api/v1/citizen/school/check
```

---

# Performance Benchmarks

| Benchmark | Value |
|------------|---------|
| Rolling R² | 0.8902 |
| Holdout R² | 0.9049 |
| PDE Compliance | 100% |
| Source Consistency | 0.9960 |
| Inference Latency | 0.46 ms |
| Attribution Latency | 3.38 ms |
| LOSO Spatial R² | 0.8327 |

---

# Deployment

## Clone Repository

```bash
git clone https://github.com/your-org/vayumind.git

cd vayumind
```

## Configure Environment

```bash
cp .env.example .env
```

## Start Platform

```bash
docker compose up --build
```

---

# Running Services

| Service | Port |
|----------|--------|
| Frontend | 3000 |
| API Gateway | 8000 |
| PINN Service | 8001 |
| Advisory Service | 8002 |
| Forecast Service | 8003 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Grafana | 3001 |
| Prometheus | 9090 |

---

# Roadmap

### Phase 1

- Delhi Deployment
- Enforcement Validation
- School Alert System

### Phase 2

- Mumbai Expansion
- WRF 1km Weather Integration
- Multi-City Dashboard

### Phase 3

- RA-BPINN
- Dynamic Sensor Placement
- Cross-City Pollution Transport

---

# Impact

Traditional AQI systems:

```text
Measure → Report
```

VayuMind:

```text
Measure
   ↓
Attribute
   ↓
Forecast
   ↓
Enforce
   ↓
Intervene
   ↓
Learn
```

---

# ET AI Hackathon 2026

**Problem Statement 5 — AI-Powered Urban Air Quality Intelligence**

> The atmosphere has always obeyed its own equations.
>
> **VayuMind is the first system that listens.**
