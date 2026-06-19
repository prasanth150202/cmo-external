from typing import Tuple, Optional, Dict, Any


def meta_f03_funnel_collapse(ctx: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """META-F03: Funnel Collapse Fire Alarm — P1 priority."""
    m7d = ctx["m7d"]
    today = ctx["today"]

    daily_avg_spend = m7d["spend"] / 7 if m7d["spend"] > 0 else 0
    if today["spend"] < (daily_avg_spend * 0.5):
        return False, None  # not enough spend today to signal collapse

    collapse = today["roas"] < (m7d["roas"] * 0.10) and m7d["roas"] > 0

    if collapse and today["spend"] > 100:
        return True, {
            "type": "EMERGENCY_STOP",
            "direction": "DOWN",
            "magnitude": 100,
            "rule_id": "META-F03",
            "priority": "P1",
            "reason": f"CRITICAL: Today ROAS ({today['roas']:.2f}x) is less than 10% of the 7-day average ({m7d['roas']:.2f}x). Funnel collapse detected.",
        }
    return False, None
