"""
Gemini AI narrative generation for rule engine suggestions.
Falls back to rule description if key is not configured or call fails.
"""
from typing import Dict, Any
from app.core.config import settings


def generate_narrative(suggestion: Dict[str, Any], metrics_context: Dict[str, Any] = None) -> str:
    """
    Generate a plain-English explanation for a rule engine suggestion.
    Returns fallback text if Gemini is unavailable.
    """
    if not settings.GEMINI_API_KEY:
        return _fallback_narrative(suggestion)

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        rule_id = suggestion.get("rule_id", "")
        direction = suggestion.get("direction", "")
        magnitude = suggestion.get("magnitude", 0)
        reason = suggestion.get("reason", "")
        entity_name = suggestion.get("entity_name", "this campaign")

        prompt = f"""You are an expert digital advertising analyst writing a concise recommendation for a CMO dashboard.

Rule triggered: {rule_id}
Campaign: {entity_name}
Action: {direction} budget by {magnitude}%
Reason: {reason}
{f"Additional context: {metrics_context}" if metrics_context else ""}

Write a 2-3 sentence explanation in plain English for the agency owner. Be direct and specific about what is happening and why this action is recommended. Do not use jargon."""

        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception:
        return _fallback_narrative(suggestion)


def _fallback_narrative(suggestion: Dict[str, Any]) -> str:
    rule_id = suggestion.get("rule_id", "")
    entity_name = suggestion.get("entity_name", "this campaign")
    reason = suggestion.get("reason", "Performance threshold crossed.")

    narratives = {
        "META-B01": f"{entity_name} is consistently outperforming your target ROAS. Increasing budget now will capture more conversions while performance is strong.",
        "META-B02": f"{entity_name} has been underperforming for 7 days. Reducing budget limits spend waste while the campaign recovers.",
        "META-F03": f"CRITICAL: {entity_name} has experienced a severe drop in ROAS today. Immediate budget reduction is recommended to prevent further wasted spend.",
    }
    return narratives.get(rule_id, reason)
