from typing import Tuple, Optional, Dict, Any


def meta_b01_scale_up(ctx: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """META-B01: Scale Up Strong Performer."""
    target_roas = ctx.get("target_roas", 2.0)
    m7d = ctx["m7d"]
    m3d = ctx["m3d"]

    scale_threshold = 1.30
    roas_7d_ok = m7d["roas"] > (target_roas * scale_threshold)
    roas_3d_ok = m3d["roas"] > (target_roas * scale_threshold * 0.90)
    not_declining = ctx.get("trajectory_score", 0) > -0.05
    budget_util_ok = ctx.get("budget_utilization_7d", 0) > 0.80
    not_learning = not ctx.get("learning_phase", False)
    has_spend = m7d["spend"] > 500

    if all([roas_7d_ok, roas_3d_ok, not_declining, budget_util_ok, not_learning, has_spend]):
        magnitude = 20 if m7d["roas"] > target_roas * 1.5 else 15
        return True, {
            "type": "BUDGET_INCREASE",
            "direction": "UP",
            "magnitude": magnitude,
            "rule_id": "META-B01",
            "priority": "P5",
            "reason": f"ROAS 7d ({m7d['roas']:.2f}x) is {round(m7d['roas']/target_roas*100-100)}% above target. Performance is stable across 3d and 7d windows.",
        }
    return False, None
