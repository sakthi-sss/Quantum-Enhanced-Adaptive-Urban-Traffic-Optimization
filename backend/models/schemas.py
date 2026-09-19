"""Pydantic models for Q-FLOW API."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum


class SignalState(str, Enum):
    NS_GREEN = "NS_GREEN"
    EW_GREEN = "EW_GREEN"
    ALL_RED = "ALL_RED"
    EMERGENCY = "EMERGENCY"


class CongestionLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IntersectionSchema(BaseModel):
    id: str
    label: str
    x: float
    y: float
    density: float
    queueLength: int
    capacity: int
    currentSignal: str
    greenDuration: int
    congestionLevel: str
    waitingTime: float
    throughput: float
    connections: List[str]
    isEmergencyActive: bool
    recommendedSignal: Optional[str] = None
    recommendedGreen: Optional[int] = None
    reason: Optional[str] = None


class TrafficEdgeSchema(BaseModel):
    from_id: str = ...
    to_id: str
    weight: float
    isGreenCorridor: bool


class TrafficStateSchema(BaseModel):
    intersections: List[IntersectionSchema]
    timestamp: float
    simulationStep: int
    mode: str  # DEMO, SUMO, HYBRID
    totalVehicles: int
    avgWaitingTime: float
    avgQueueLength: float
    throughput: float
    fuelEstimate: float
    co2Estimate: float


class OptimizeRequest(BaseModel):
    intersections: List[IntersectionSchema]
    scenario: Optional[str] = None


class EmergencyRequest(BaseModel):
    route: List[str]
    ambulanceId: str = "AMB-01"


class ScenarioRequest(BaseModel):
    scenarioId: str
