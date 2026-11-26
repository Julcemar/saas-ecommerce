import re
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.schemas.customer import CustomerAddressResponse


def only_digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def is_valid_cpf(cpf: str) -> bool:
    digits = only_digits(cpf)
    if len(digits) != 11 or len(set(digits)) == 1:
        return False
    for i in range(9, 11):
        total = sum(int(digits[num]) * ((i + 1) - num) for num in range(i))
        check = (total * 10) % 11
        if check == 10:
            check = 0
        if check != int(digits[i]):
            return False
    return True


def is_valid_cnpj(cnpj: str) -> bool:
    digits = only_digits(cnpj)
    if len(digits) != 14 or len(set(digits)) == 1:
        return False
    weights_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    def calc_digit(base: str, weights: List[int]) -> int:
        s = sum(int(base[idx]) * weights[idx] for idx in range(len(weights)))
        rem = s % 11
        return 0 if rem < 2 else 11 - rem

    d1 = calc_digit(digits[:12], weights_1)
    d2 = calc_digit(digits[:13], weights_2)
    return int(digits[12]) == d1 and int(digits[13]) == d2


def format_cpf_cnpj(value: str, person_type: str) -> str:
    d = only_digits(value)
    if person_type == "PF" and len(d) == 11:
        return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"
    if person_type == "PJ" and len(d) == 14:
        return f"{d[:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:]}"
    return value.strip()


class StorefrontCustomerRegister(BaseModel):
    person_type: str = Field(default="PF")
    full_name: str = Field(..., min_length=2, max_length=255)
    company_name: Optional[str] = Field(default=None, max_length=255)
    tax_id: str = Field(..., min_length=11, max_length=30)
    state_tax_id: Optional[str] = Field(default=None, max_length=50)
    phone: str = Field(..., min_length=8, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("person_type")
    @classmethod
    def validate_person_type(cls, v: str) -> str:
        val = (v or "PF").strip().upper()
        if val not in ("PF", "PJ"):
            raise ValueError("Tipo de pessoa inválido. Utilize PF ou PJ.")
        return val

    @field_validator("tax_id")
    @classmethod
    def validate_tax_id(cls, v: str, info) -> str:
        pt = (info.data.get("person_type") or "PF").upper()
        digits = only_digits(v)
        if pt == "PF":
            if not is_valid_cpf(digits):
                raise ValueError("CPF inválido.")
        else:
            if not is_valid_cnpj(digits):
                raise ValueError("CNPJ inválido.")
        return format_cpf_cnpj(digits, pt)


class StorefrontCustomerLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class StorefrontForgotPasswordRequest(BaseModel):
    email: EmailStr


class StorefrontResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=6, max_length=128)


class StorefrontCustomerProfile(BaseModel):
    id: UUID
    tenant_id: UUID
    person_type: str
    full_name: str
    company_name: Optional[str] = None
    tax_id: Optional[str] = None
    state_tax_id: Optional[str] = None
    email: Optional[str] = None
    phone: str = ""
    birth_date: Optional[date] = None
    created_at: datetime
    addresses: List[CustomerAddressResponse] = []

    model_config = ConfigDict(from_attributes=True)


class StorefrontCustomerTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_slug: str
    customer: StorefrontCustomerProfile


class StorefrontCustomerUpdate(BaseModel):
    person_type: Optional[str] = None
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    company_name: Optional[str] = Field(default=None, max_length=255)
    tax_id: Optional[str] = Field(default=None, max_length=30)
    state_tax_id: Optional[str] = Field(default=None, max_length=50)
    phone: Optional[str] = Field(default=None, min_length=8, max_length=30)
    birth_date: Optional[date] = None


class StorefrontPasswordUpdate(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)
