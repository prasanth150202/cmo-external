from typing import Tuple, Optional, Dict, Any


def meta_b02_scale_down(ctx: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """META-B02: Scale Down Consistent Underperformer."""
    target_roas = ctx.get("target_roas", 2.0)
    m7d = ctx["m7d"]
    m3d = ctx["m3d"]

    cut_threshold = 0.60
    roas_7d_bad = m7d["roas"] < (target_roas * cut_threshold)
    roas_3d_bad = m3d["roas"] < (target_roas * cut_threshold * 1.15) if m3d["spend"] > 0 else roas_7d_bad
    not_recovering = ctx.get("trajectory_score", 0) < 0.05
    has_spend = m7d["spend"] > 2000
    not_new = ctx.get("age_days", 30) > 5

    if all([roas_7d_bad, roas_3d_bad, not_recovering, has_spend, not_new]):
        return True, {
            "type": "BUDGET_DECREASE",
            "direction": "DOWN",
            "magnitude": 20,
            "rule_id": "META-B02",
            "priority": "P5",
            "reason": f"ROAS 7d ({m7d['roas']:.2f}x) has been below {round(cut_threshold*100)}% of target for 7 days with no recovery trend.",
        }
    return False, None
