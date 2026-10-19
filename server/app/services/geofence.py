import math
from typing import Tuple, Dict, Any, List

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two GPS points in meters
    using the Haversine formula.
    """
    R = 6371000.0  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

def verify_seeker_proximity(
    hider_lat: float,
    hider_lon: float,
    seeker_lat: float,
    seeker_lon: float,
    threshold_meters: float = 15.0
) -> Tuple[bool, float]:
    """
    Returns (True, distance_meters) if the seeker is within the threshold distance of the hider.
    """
    dist = calculate_distance(hider_lat, hider_lon, seeker_lat, seeker_lon)
    return (dist <= threshold_meters, dist)

# Storm Phases (radii in meters)
STORM_RADII = [500, 350, 220, 120, 50, 20]
STORM_DAMAGE = [1, 2, 5, 8, 10, 15]
PHASE_DURATION_SECONDS = 300  # 5 minutes per circle shrink

def calculate_storm_status(
    elapsed_seconds: int,
    center_lat: float,
    center_lon: float,
    user_lat: float,
    user_lon: float
) -> Dict[str, Any]:
    """
    Calculates current storm phase, current safe radius, next radius, and user damage.
    """
    phase = min(5, elapsed_seconds // PHASE_DURATION_SECONDS)
    current_radius = STORM_RADII[phase]
    next_radius = STORM_RADII[phase + 1] if phase < 5 else STORM_RADII[5]
    closes_in = PHASE_DURATION_SECONDS - (elapsed_seconds % PHASE_DURATION_SECONDS)

    dist_from_center = calculate_distance(center_lat, center_lon, user_lat, user_lon)
    is_in_safe_zone = dist_from_center <= current_radius
    damage_per_tick = 0 if is_in_safe_zone else STORM_DAMAGE[phase]

    return {
        "phase": phase,
        "current_radius": current_radius,
        "next_radius": next_radius,
        "closes_in_seconds": closes_in,
        "dist_from_center": round(dist_from_center, 1),
        "in_safe_zone": is_in_safe_zone,
        "damage_rate": damage_per_tick
    }
