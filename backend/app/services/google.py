"""
Google Ads API service.
Uses the tenant's own OAuth access_token + refresh_token.
Refresh is handled transparently via google-auth library.
"""
from typing import List, Dict, Any, Optional
from datetime import date
from app.core.config import settings


class GoogleAdsService:
    def _build_credentials(self, access_token: str, refresh_token: str):
        """Build Google OAuth2 credentials object."""
        from google.oauth2.credentials import Credentials
        return Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=["https://www.googleapis.com/auth/adwords"],
        )

    def _build_client(self, access_token: str, refresh_token: str):
        """Build Google Ads API client for a tenant's token."""
        try:
            from google.ads.googleads.client import GoogleAdsClient
            credentials = self._build_credentials(access_token, refresh_token)
            return GoogleAdsClient(
                credentials=credentials,
                developer_token=settings.GOOGLE_ADS_DEVELOPER_TOKEN,
                version="v17",
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
                metrics.roas,
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
        client = self._build_client(access_token, refresh_token)
        ga_service = client.get_service("GoogleAdsService")

        query = f"""
            SELECT
                campaign.id,
                campaign.name,
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

        # Fetch descriptive names for each customer account
        ga_service = client.get_service("GoogleAdsService")
        results = []
        for cid in customer_ids:
            try:
                query = "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1"
                resp = ga_service.search(customer_id=cid, query=query)
                for row in resp:
                    results.append({
                        "customer_id": str(row.customer.id),
                        "descriptive_name": row.customer.descriptive_name or f"Account {cid}",
                    })
                    break
            except Exception:
                results.append({"customer_id": cid, "descriptive_name": f"Account {cid}"})
        return results


google_service = GoogleAdsService()
