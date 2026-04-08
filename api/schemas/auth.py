from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    org_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)

    @field_validator("org_name")
    @classmethod
    def org_name_not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("org_name must contain at least one non-whitespace character")
        return stripped


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
