"""FastAPI main application"""
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import CORS_ORIGINS, API_HOST, API_PORT

# Import routes
from app.routes import command, attribution, forecast, enforcement, citizen

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="VayuMind API",
    description="AI-Powered Urban Air Quality Intelligence Platform",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Include routers
app.include_router(command.router)
app.include_router(attribution.router)
app.include_router(forecast.router)
app.include_router(enforcement.router)
app.include_router(citizen.router)

# Health check
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}

# Root
@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "VayuMind API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "command": "/api/command/*",
            "attribution": "/api/attribution/*",
            "forecast": "/api/forecast/*",
            "enforcement": "/api/enforcement/*",
            "citizen": "/api/citizen/*",
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
    )
