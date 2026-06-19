from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    agency_name: str
    email: EmailStr
    password: str
    timezone: str = "UTC"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    tenant_id: str

    class Config:
        from_attributes = True
