"""
Q-FLOW FastAPI Backend
======================
Main application entry point.

Endpoints:
  GET  /api/health      - Health check
  GET  /api/network     - Network topology
  GET  /api/traffic     - Current traffic state
  GET  /api/signals     - Current signal states
  POST /api/optimize    - Run QUBO/QAOA optimization
  POST /api/emergency   - Activate green corridor
  POST /api/simulation/start - Start simulation
  POST /api/simulation/step  - Run one simulation step
  POST /api/simulation/reset - Reset simulation
  GET  /api/metrics     - Aggregate metrics

Run:
  uvicorn main:app --reload --port 8000

The system automatically uses Demo Mode if SUMO/Qiskit are unavailable.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Q-FLOW API",
    description="Hybrid Quantum-Classical Adaptive Urban Traffic Optimization API",
    version="1.0.0",
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import services
try:
    from services.sumo_service import sumo_service, _sim_state, INTERSECTIONS_DEFAULT
    from quantum.optimizer import run_full_optimization
    SERVICES_OK = True
except ImportError as e:
    logger.error(f"Service import error: {e}")
    SERVICES_OK = False

# ─── Models ───────────────────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    intersections: Optional[List[Dict]] = None
    scenario: Optional[str] = None
    emergency_route: Optional[List[str]] = None

class EmergencyRequest(BaseModel):
    route: List[str] = ["S1", "S3", "S4"]
    ambulance_id: str = "AMB-01"

class SignalConfig(BaseModel):
    intersection_id: str
    signal: str
    green_duration: int

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "timestamp": time.time(),
        "mode": "DEMO" if not SERVICES_OK else sumo_service.mode,
        "version": "1.0.0",
    }


@app.get("/api/network")
async def get_network():
    """Return network topology."""
    intersections = sumo_service.get_intersection_data() if SERVICES_OK else INTERSECTIONS_DEFAULT
    edges = [
        {"from": "S1", "to": "S3", "weight": 1, "isGreenCorridor": False},
        {"from": "S2", "to": "S3", "weight": 1, "isGreenCorridor": False},
        {"from": "S3", "to": "S4", "weight": 1, "isGreenCorridor": False},
        {"from": "S3", "to": "S5", "weight": 1, "isGreenCorridor": False},
        {"from": "S5", "to": "S6", "weight": 1, "isGreenCorridor": False},
    ]
    return {
        "intersections": intersections,
        "edges": edges,
        "mode": sumo_service.mode if SERVICES_OK else "DEMO",
    }


@app.get("/api/traffic")
async def get_traffic():
    """Return current traffic state."""
    if not SERVICES_OK:
        return {"intersections": INTERSECTIONS_DEFAULT, "mode": "DEMO"}
    
    intersections = sumo_service.get_intersection_data()
    metrics = sumo_service.get_metrics()
    return {
        "intersections": intersections,
        "timestamp": time.time(),
        "simulationStep": metrics["simulationStep"],
        "mode": sumo_service.mode,
        "totalVehicles": metrics["totalVehicles"],
        "avgWaitingTime": metrics["avgWaitingTime"],
        "avgQueueLength": metrics["avgQueueLength"],
        "throughput": metrics["throughput"],
        "fuelEstimate": metrics["fuelEstimate"],
        "co2Estimate": metrics["co2Estimate"],
    }


@app.get("/api/signals")
async def get_signals():
    """Return current signal states."""
    intersections = sumo_service.get_intersection_data() if SERVICES_OK else INTERSECTIONS_DEFAULT
    return {
        "signals": {
            ix["id"]: {
                "signal": ix["currentSignal"],
                "greenDuration": ix["greenDuration"],
            }
            for ix in intersections
        }
    }


@app.post("/api/optimize")
async def optimize(request: OptimizeRequest):
    """
    Run QUBO/QAOA hybrid optimization.
    
    Pipeline:
      1. Get traffic state
      2. Build QUBO
      3. Run QAOA (Qiskit Aer if available, else demo)
      4. Decode best configuration
      5. Apply signals
      6. Return result
    """
    if not SERVICES_OK:
        return {"error": "Services not available", "mode": "DEMO"}
    
    intersections = request.intersections
    if not intersections:
        intersections = sumo_service.get_intersection_data()
    
    try:
        result = run_full_optimization(
            intersections,
            scenario=request.scenario,
            emergency_route=request.emergency_route,
        )
        
        # Apply signals to simulation
        sumo_service.apply_signal_config(result["signalConfig"])
        
        return result
    except Exception as e:
        logger.error(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/emergency")
async def emergency(request: EmergencyRequest):
    """Activate emergency green corridor."""
    if not SERVICES_OK:
        return {"status": "DEMO", "route": request.route}
    
    # Activate green on route intersections
    for ix_id in request.route:
        sumo_service.set_signal_timing(ix_id, "EMERGENCY", 60)
    
    # Estimate ETA improvement
    intersections = sumo_service.get_intersection_data()
    route_ix = [ix for ix in intersections if ix["id"] in request.route]
    avg_density = sum(ix["density"] for ix in route_ix) / max(len(route_ix), 1)
    
    base_secs = len(request.route) * 55
    congestion_penalty = (avg_density / 100) * 120
    eta_before = round(base_secs + congestion_penalty)
    eta_after = round(base_secs * 0.78 + congestion_penalty * 0.28)
    
    return {
        "status": "ACTIVE",
        "ambulanceId": request.ambulance_id,
        "route": request.route,
        "etaBefore": eta_before,
        "etaAfter": eta_after,
        "timeSaved": eta_before - eta_after,
        "corridorStatus": "GREEN",
        "label": "Simulation Result",
    }


@app.post("/api/simulation/start")
async def start_simulation():
    if not SERVICES_OK:
        return {"status": "DEMO", "mode": "DEMO"}
    sumo_service.start_simulation()
    return {"status": "STARTED", "mode": sumo_service.mode}


@app.post("/api/simulation/step")
async def simulation_step():
    if not SERVICES_OK:
        return {"status": "DEMO"}
    data = sumo_service.get_intersection_data()
    return {"intersections": data, "step": sumo_service.step_count}


@app.post("/api/simulation/reset")
async def reset_simulation():
    if SERVICES_OK:
        sumo_service.reset()
    return {"status": "RESET"}


@app.get("/api/metrics")
async def get_metrics():
    if not SERVICES_OK:
        return {"mode": "DEMO", "totalVehicles": 92, "avgWaitingTime": 42}
    return sumo_service.get_metrics()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
