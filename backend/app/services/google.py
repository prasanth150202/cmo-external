"""
Google Ads API service.
Uses the tenant's own OAuth access_token + refresh_token.
Refresh is handled transparently via google-auth library.
"""
from typing import List, Dict, Any, Optional
from datetime import date
from concurrent.futures import ThreadPoolExecutor
from app.core.config import settings

ACCOUNT_LOOKUP_WORKERS = 10


class GoogleAdsService:
    def _build_credentials(self, access_token: str, refresh_token: str):
        """
        Build Google OAuth2 credentials and eagerly refresh the access token.
        We don't pass `expiry`, so google-auth's expired-token check never
        fires on its own — without this explicit refresh, a stale access_token
        (they last ~1hr) gets sent straight to Google and 401s.
        """
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request

        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=["https://www.googleapis.com/auth/adwords"],
        )
        credentials.refresh(Request())
        return credentials

    def _build_client(self, access_token: str, refresh_token: str):
        """Build Google Ads API client for a tenant's token."""
        try:
            from google.ads.googleads.client import GoogleAdsClient
            credentials = self._build_credentials(access_token, refresh_token)
            return GoogleAdsClient(
                credentials=credentials,
                developer_token=settings.GOOGLE_ADS_DEVELOPER_TOKEN,
                version="v25",
            )
        except ImportError:
            raise RuntimeError("google-ads SDK not installed")

    def fetch_account_daily_metrics(
        self,
        access_token: str,
        refresh_token: str,
        customer_id: str,
        date_from: date,
        date_to: date,
    ) -> List[Dict[str, Any]]:
        """Pulls account-level daily metrics from Google Ads."""
        client = self._build_client(access_token, refresh_token)
        ga_service = client.get_service("GoogleAdsService")

        query = f"""
            SELECT
                segments.date,
                metrics.cost_micros,
                metrics.conversions_value,
                metrics.conversions,
                metrics.impressions,
                metrics.clicks,
                metrics.ctr
            FROM customer
            WHERE segments.date BETWEEN '{date_from.isoformat()}' AND '{date_to.isoformat()}'
            ORDER BY segments.date ASC
        """

        try:
            response = ga_service.search(customer_id=customer_id.replace("-", ""), query=query)
            result = []
            for row in response:
                spend = row.metrics.cost_micros / 1_000_000
                revenue = row.metrics.conversions_value
                roas = revenue / spend if spend > 0 else 0
                result.append({
                    "date": row.segments.date,
                    "spend": round(spend, 2),
                    "revenue": round(revenue, 2),
                    "roas": round(roas, 4),
                    "conversions": int(row.metrics.conversions),
                    "impressions": int(row.metrics.impressions),
                    "clicks": int(row.metrics.clicks),
                    "ctr": round(row.metrics.ctr, 4),
                })
            return result
        except Exception as e:
            raise RuntimeError(f"Google Ads API error: {e}")

    def fetch_campaign_daily_metrics(
        self,
        access_token: str,
        refresh_token: str,
        customer_id: str,
        date_from: date,
        date_to: date,
    ) -> List[Dict[str, Any]]:
        """Pulls campaign-level daily metrics from Google Ads."""
        from google.ads.googleads.v25.enums.types.campaign_status import CampaignStatusEnum
        status_enum = CampaignStatusEnum.CampaignStatus
        # "ACTIVE" (not Google's own "ENABLED") — the frontend's Live/All filter
        # checks status === "ACTIVE" specifically.
        STATUS_MAP = {status_enum.ENABLED: "ACTIVE", status_enum.PAUSED: "PAUSED", status_enum.REMOVED: "REMOVED"}

        client = self._build_client(access_token, refresh_token)
        ga_service = client.get_service("GoogleAdsService")

        query = f"""
            SELECT
                campaign.id,
                campaign.name,
                campaign.status,
                segments.date,
                metrics.cost_micros,
                metrics.conversions_value,
                metrics.conversions,
                metrics.impressions,
                metrics.clicks,
                metrics.ctr
            FROM campaign
            WHERE segments.date BETWEEN '{date_from.isoformat()}' AND '{date_to.isoformat()}'
            ORDER BY segments.date ASC
        """

        try:
            response = ga_service.search(customer_id=customer_id.replace("-", ""), query=query)
            result = []
            for row in response:
                spend = row.metrics.cost_micros / 1_000_000
                revenue = row.metrics.conversions_value
                roas = revenue / spend if spend > 0 else 0
                result.append({
                    "date": row.segments.date,
                    "campaign_id": str(row.campaign.id),
                    "campaign_name": row.campaign.name,
                    "status": STATUS_MAP.get(row.campaign.status),
                    "spend": round(spend, 2),
                    "revenue": round(revenue, 2),
                    "roas": round(roas, 4),
                    "conversions": int(row.metrics.conversions),
                    "impressions": int(row.metrics.impressions),
                    "clicks": int(row.metrics.clicks),
                    "ctr": round(row.metrics.ctr, 4),
                })
            return result
        except Exception as e:
            raise RuntimeError(f"Google Ads API error: {e}")

    def list_accessible_customers(self, access_token: str, refresh_token: str) -> List[Dict[str, Any]]:
        """List all Google Ads customer accounts accessible to this OAuth token."""
        client = self._build_client(access_token, refresh_token)
        customer_service = client.get_service("CustomerService")
        try:
            accessible = customer_service.list_accessible_customers()
            customer_ids = [r.split("/")[-1] for r in accessible.resource_names]
        except Exception as e:
            raise RuntimeError(f"Google list customers error: {e}")

        # Fetch descriptive names for each customer account, in parallel —
        # this is N independent round trips, not safe to serialize.
        ga_service = client.get_service("GoogleAdsService")

        def _fetch_name(cid: str) -> Dict[str, Any]:
            try:
                query = "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1"
                resp = ga_service.search(customer_id=cid, query=query)
                for row in resp:
                    return {
                        "customer_id": str(row.customer.id),
                        "descriptive_name": row.customer.descriptive_name or f"Account {cid}",
                    }
                return {"customer_id": cid, "descriptive_name": f"Account {cid}"}
            except Exception:
                return {"customer_id": cid, "descriptive_name": f"Account {cid}"}

        with ThreadPoolExecutor(max_workers=ACCOUNT_LOOKUP_WORKERS) as pool:
            results = list(pool.map(_fetch_name, customer_ids))
        return results

    def fetch_campaign_conversion_categories(
        self,
        access_token: str,
        refresh_token: str,
        customer_id: str,
        date_from: date,
        date_to: date,
    ) -> List[Dict[str, Any]]:
        """
        Per-campaign conversion counts broken down by conversion_action_category
        (e.g. PURCHASE vs SUBMIT_LEAD_FORM). Used to auto-classify a campaign as
        Sales vs Lead Gen based on what it's actually converting on.
        """
        from google.ads.googleads.v25.enums.types.conversion_action_category import (
            ConversionActionCategoryEnum,
        )
        category_enum = ConversionActionCategoryEnum.ConversionActionCategory

        client = self._build_client(access_token, refresh_token)
        ga_service = client.get_service("GoogleAdsService")

        query = f"""
            SELECT
                campaign.id,
                segments.conversion_action_category,
                metrics.conversions
            FROM campaign
            WHERE segments.date BETWEEN '{date_from.isoformat()}' AND '{date_to.isoformat()}'
        """

        try:
            response = ga_service.search(customer_id=customer_id.replace("-", ""), query=query)
            result = []
            for row in response:
                category_value = row.segments.conversion_action_category
                try:
                    category_name = category_enum(category_value).name
                except ValueError:
                    category_name = "UNSPECIFIED"
                result.append({
                    "campaign_id": str(row.campaign.id),
                    "category": category_name,
                    "conversions": row.metrics.conversions,
                })
            return result
        except Exception as e:
            raise RuntimeError(f"Google Ads API error: {e}")


google_service = GoogleAdsService()
