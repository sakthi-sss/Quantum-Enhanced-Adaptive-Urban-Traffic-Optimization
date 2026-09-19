"""
QUBO Formulation Module
=======================
Builds a Quadratic Unconstrained Binary Optimization (QUBO) problem
from the current traffic state.

Each binary variable x_i represents the signal phase for intersection i:
  x_i = 0 -> EW_GREEN
  x_i = 1 -> NS_GREEN

The objective function minimizes:
  x^T Q x

where Q encodes:
  - Traffic density penalties (diagonal)
  - Queue length penalties (diagonal)
  - Coupling between adjacent intersections (off-diagonal)
  - Emergency route constraints

NOTE: This is a classical formulation of a combinatorial optimization problem.
The QUBO structure is what makes it compatible with quantum optimization (QAOA).
"""

import numpy as np
from typing import List, Dict, Any

# Network adjacency (intersection pairs that share a road)
NETWORK_EDGES = [
    ("S1", "S3"),
    ("S2", "S3"),
    ("S3", "S4"),
    ("S3", "S5"),
    ("S5", "S6"),
]


def build_qubo(
    intersections: List[Dict],
    emergency_route: List[str] = None,
    lambda_density: float = 2.0,
    lambda_queue: float = 1.5,
    lambda_coupling: float = 0.5,
    lambda_emergency: float = 3.0,
) -> Dict:
    """
    Build QUBO matrix from intersection traffic state.
    
    Args:
        intersections: List of intersection data dicts
        emergency_route: List of intersection IDs on emergency route
        lambda_density: Penalty weight for traffic density
        lambda_queue: Penalty weight for queue length
        lambda_coupling: Coupling weight between adjacent intersections
        lambda_emergency: Emergency priority weight
    
    Returns:
        QUBO dict with matrix Q, variables, and objective value
    """
    n = len(intersections)
    id_to_idx = {ix["id"]: i for i, ix in enumerate(intersections)}
    Q = np.zeros((n, n))
    
    # Build diagonal penalty terms
    # λ₁·density + λ₂·queue + λ₃·pedestrian_demand
    variables = []
    for i, ix in enumerate(intersections):
        density_norm = ix["density"] / 100.0
        queue_norm = ix["queueLength"] / max(ix["capacity"], 1)
        pedestrian_norm = ix.get("pedestrianDemand", 0) / 100.0
        
        # Diagonal: penalize wrong signal for high-demand direction
        # Higher pedestrian demand → prefer shorter vehicle green (more pedestrian time)
        diagonal_penalty = -(lambda_density * density_norm + lambda_queue * queue_norm + 0.8 * pedestrian_norm)
        Q[i][i] = diagonal_penalty
        
        # Emergency route: strongly prefer green on route intersections
        if emergency_route and ix["id"] in emergency_route:
            Q[i][i] -= lambda_emergency
        
        # Current phase value
        value = 1 if ix.get("currentSignal", "EW_GREEN") == "NS_GREEN" else 0
        
        variables.append({
            "id": f"x{i+1}",
            "intersection": ix["id"],
            "description": f"{ix['id']} signal phase (0=EW_GREEN, 1=NS_GREEN)",
            "value": value,
            "encoding": f"Binary: x{i+1} ∈ {{0,1}}",
        })
    
    # Build off-diagonal coupling terms
    for (from_id, to_id) in NETWORK_EDGES:
        if from_id in id_to_idx and to_id in id_to_idx:
            i = id_to_idx[from_id]
            j = id_to_idx[to_id]
            Q[i][j] = lambda_coupling
            Q[j][i] = lambda_coupling
    
    # Compute objective value for current assignment
    x = np.array([v["value"] for v in variables])
    objective_value = float(x @ Q @ x)
    
    # Compute penalty terms for display
    avg_wait = sum(ix["waitingTime"] for ix in intersections) / n
    total_queue = sum(ix["queueLength"] for ix in intersections)
    critical_count = sum(1 for ix in intersections if ix["density"] > 85)
    
    return {
        "variables": variables,
        "Q": Q.tolist(),
        "offset": 0.0,
        "objectiveValue": objective_value,
        "penaltyTerms": {
            "waitingTime": avg_wait,
            "queueLength": total_queue,
            "congestion": critical_count * 10,
            "emergencyDelay": 0,
            "fuel": avg_wait * 1.8,
            "pedestrianDelay": round(sum(ix.get("pedestrianDemand", 0) for ix in intersections) / n * 0.6),
        },
        "lambdas": {
            "density": lambda_density,
            "queue": lambda_queue,
            "coupling": lambda_coupling,
            "emergency": lambda_emergency,
        },
    }


def qubo_cost(Q_matrix: np.ndarray, x: np.ndarray) -> float:
    """Compute QUBO cost x^T Q x."""
    return float(x @ Q_matrix @ x)
