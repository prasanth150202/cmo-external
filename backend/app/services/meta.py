"""
Meta Ads API service.
Uses the tenant's own OAuth access token (stored in oauth_tokens).
Falls back gracefully when token or SDK is unavailable.
"""
from typing import List, Dict, Any, Optional
from datetime import date, timedelta


def _extract_action(data: Optional[List[Dict]], action_type: str) -> float:
    for item in (data or []):
        if item.get("action_type") == action_type:
            return float(item.get("value", 0))
    return 0.0


class MetaService:
    def fetch_account_daily_metrics(
        self,
        access_token: str,
        account_id: str,
        date_from: date,
        date_to: date,
    ) -> List[Dict[str, Any]]:
        """
        Pulls account-level daily insights from Meta for a date range.
        Returns list of dicts with: date, spend, revenue, roas, conversions, impressions, clicks, ctr
        """
        if not account_id.startswith("act_"):
            account_id = f"act_{account_id}"

        try:
            from facebook_business.api import FacebookAdsApi
            from facebook_business.adobjects.adaccount import AdAccount

            FacebookAdsApi.init(access_token=access_token, api_version="v20.0")
            account = AdAccount(account_id)

            insights = account.get_insights(
                fields=[
                    "date_start",
                    "spend",
                    "impressions",
                    "clicks",
                    "ctr",
                    "actions",
                    "action_values",
                    "purchase_roas",
                ],
                params={
                    "level": "account",
                    "time_range": {
                        "since": date_from.isoformat(),
                        "until": date_to.isoformat(),
                    },
                    "time_increment": 1,  # one row per day
                    "limit": 500,
                },
            )

            result = []
            for row in insights:
                data = row.export_all_data()
                spend = float(data.get("spend", 0) or 0)
                revenue = _extract_action(data.get("action_values"), "omni_purchase")
                conversions = int(_extract_action(data.get("actions"), "omni_purchase"))
                roas_list = data.get("purchase_roas")
                roas = _extract_action(roas_list, "omni_purchase") if roas_list else (revenue / spend if spend > 0 else 0)
                result.append({
                    "date": data.get("date_start"),
                    "spend": round(spend, 2),
                    "revenue": round(revenue, 2),
                    "roas": round(roas, 4),
                    "conversions": conversions,
                    "impressions": int(data.get("impressions", 0) or 0),
                    "clicks": int(data.get("clicks", 0) or 0),
                    "ctr": round(float(data.get("ctr", 0) or 0), 4),
                })
            return result

        except ImportError:
            raise RuntimeError("facebook-business SDK not installed")
        except Exception as e:
            raise RuntimeError(f"Meta API error: {e}")

    def fetch_campaign_daily_metrics(
        self,
        access_token: str,
        account_id: str,
        date_from: date,
        date_to: date,
    ) -> List[Dict[str, Any]]:
        """Campaign-level daily insights."""
        if not account_id.startswith("act_"):
            account_id = f"act_{account_id}"

        try:
            from facebook_business.api import FacebookAdsApi
            from facebook_business.adobjects.adaccount import AdAccount

            FacebookAdsApi.init(access_token=access_token, api_version="v20.0")
            account = AdAccount(account_id)

            insights = account.get_insights(
                fields=[
                    "date_start",
                    "campaign_id",
                    "campaign_name",
                    "spend",
                    "impressions",
                    "clicks",
                    "ctr",
                    "actions",
                    "action_values",
                    "purchase_roas",
                ],
                params={
                    "level": "campaign",
                    "time_range": {
                        "since": date_from.isoformat(),
                        "until": date_to.isoformat(),
                    },
                    "time_increment": 1,
                    "limit": 500,
                },
            )

            result = []
            for row in insights:
                data = row.export_all_data()
                spend = float(data.get("spend", 0) or 0)
                revenue = _extract_action(data.get("action_values"), "omni_purchase")
                conversions = int(_extract_action(data.get("actions"), "omni_purchase"))
                roas_list = data.get("purchase_roas")
                roas = _extract_action(roas_list, "omni_purchase") if roas_list else (revenue / spend if spend > 0 else 0)
                result.append({
                    "date": data.get("date_start"),
                    "campaign_id": data.get("campaign_id", ""),
                    "campaign_name": data.get("campaign_name", ""),
                    "spend": round(spend, 2),
                    "revenue": round(revenue, 2),
                    "roas": round(roas, 4),
                    "conversions": conversions,
                    "impressions": int(data.get("impressions", 0) or 0),
                    "clicks": int(data.get("clicks", 0) or 0),
                    "ctr": round(float(data.get("ctr", 0) or 0), 4),
                })
            return result

        except ImportError:
            raise RuntimeError("facebook-business SDK not installed")
        except Exception as e:
            raise RuntimeError(f"Meta API error: {e}")

    def list_ad_accounts(self, access_token: str) -> List[Dict[str, Any]]:
        """List all ad accounts accessible to this token (for account mapping UI)."""
        try:
            from facebook_business.api import FacebookAdsApi
            from facebook_business.adobjects.user import User as FBUser

            FacebookAdsApi.init(access_token=access_token, api_version="v20.0")
            me = FBUser(fbid="me")
            accounts = me.get_ad_accounts(fields=["account_id", "name", "account_status", "currency"])
            return [
                {
                    "account_id": a.get("account_id"),
                    "name": a.get("name"),
                    "status": a.get("account_status"),
                    "currency": a.get("currency"),
                }
                for a in accounts
            ]
        except Exception as e:
            raise RuntimeError(f"Meta list accounts error: {e}")


meta_service = MetaService()
