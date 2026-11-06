"""Request / response models. Invalid input is rejected with HTTP 422.

Field names are camelCase because that is what the frontend sends.
"""

from datetime import date
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.categories import CASH_WITHDRAWAL, CATEGORY_TYPES
from app.migrations import migrate_debt, migrate_transaction

# Money: up to 9 digits before the point and 3 after (matches NUMERIC(12, 3)).
PositiveMoney = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=3)]
NonNegativeMoney = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=3)]
SignedMoney = Annotated[Decimal, Field(max_digits=12, decimal_places=3)]

Currency = Literal["TND", "EUR"]
Percent = Annotated[float, Field(ge=0, le=100)]


class TransactionIn(BaseModel):
    model_config = {"populate_by_name": True}

    id: Annotated[str, Field(min_length=1, max_length=36)]
    date: date
    type: Literal["income", "expense"]
    amount: PositiveMoney
    currency: Currency
    category: str
    notes: Annotated[str, Field(max_length=1000)] = ""
    recurring: bool = False
    createdAt: int = Field(default=0, ge=0)
    kind: Literal["normal", "cash_withdrawal"] = "normal"
    paymentMethod: Literal["cash", "bank", "card"] = "bank"
    cardSettled: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def _normalize_legacy(cls, data: Any) -> Any:
        # Old clients sent other shapes (e.g. category "caisse"); fix them first.
        return migrate_transaction(data) if isinstance(data, dict) else data

    @model_validator(mode="after")
    def _check_category(self) -> "TransactionIn":
        if self.kind == "cash_withdrawal":
            if self.category != CASH_WITHDRAWAL:
                raise ValueError("a cash withdrawal must use category 'cash_withdrawal'")
            return self
        expected_type = CATEGORY_TYPES.get(self.category)
        if expected_type is None:
            raise ValueError(f"unknown category '{self.category}'")
        if expected_type != self.type:
            raise ValueError(f"category '{self.category}' is for {expected_type}, not {self.type}")
        return self


class MonthlyFundsIn(BaseModel):
    yearMonth: Annotated[str, Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]
    commitments: NonNegativeMoney = Decimal(0)
    personal: NonNegativeMoney = Decimal(0)
    investment: NonNegativeMoney = Decimal(0)


class DebtIn(BaseModel):
    model_config = {"populate_by_name": True}

    id: Annotated[str, Field(min_length=1, max_length=36)]
    type: Literal["borrowed", "lent"]
    label: Annotated[str, Field(min_length=1, max_length=255)]
    amount: PositiveMoney
    currency: Currency = "TND"
    date: date
    deadline: date | None = None  # "" from the form means "no deadline"
    notes: Annotated[str, Field(max_length=1000)] = ""
    status: Literal["open", "closed"] = "open"
    createdAt: int = Field(default=0, ge=0)

    @model_validator(mode="before")
    @classmethod
    def _normalize_legacy(cls, data: Any) -> Any:
        return migrate_debt(data) if isinstance(data, dict) else data

    @field_validator("deadline", mode="before")
    @classmethod
    def _empty_deadline(cls, value: Any) -> Any:
        return None if value == "" else value


class FundSplits(BaseModel):
    commitments: Percent = 40
    personal: Percent = 20
    investment: Percent = 40


class SettingsIn(BaseModel):
    """PATCH body: send only the fields you want to change."""

    language: Literal["ar", "en"] | None = None
    theme: Literal["light", "dark"] | None = None
    salary: NonNegativeMoney | None = None
    fundSplits: FundSplits | None = None
    cashBalanceOffset: SignedMoney | None = None


class SettingsOut(BaseModel):
    language: str
    theme: str
    salary: float
    fundSplits: FundSplits
    cashBalanceOffset: float = 0
