from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_tenant_id

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
def list_reports(tenant_id: str = Depends(get_current_tenant_id)):
    return {"reports": [], "message": "Report export available in Phase 2"}


@router.post("/generate")
def generate_report(tenant_id: str = Depends(get_current_tenant_id)):
    raise HTTPException(status_code=501, detail="Report generation available in Phase 2 (PDF/CSV + S3 export)")


@router.get("/{report_id}/download")
def download_report(report_id: str, tenant_id: str = Depends(get_current_tenant_id)):
    raise HTTPException(status_code=501, detail="Report download available in Phase 2")
