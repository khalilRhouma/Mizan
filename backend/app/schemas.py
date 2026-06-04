from pydantic import BaseModel, Field


class TransactionIn(BaseModel):
    id: str
    date: str
    type: str
    amount: float
    currency: str
    category: str
    notes: str = ""
    recurring: bool = False
    createdAt: int = Field(default=0, alias="createdAt")
    kind: str = "normal"
    paymentMethod: str = Field(default="bank", alias="paymentMethod")

    model_config = {"populate_by_name": True}


class TransactionOut(TransactionIn):
    pass


class MonthlyFundsIn(BaseModel):
    yearMonth: str
    commitments: float = 0
    personal: float = 0
    investment: float = 0


class DebtIn(BaseModel):
    id: str
    type: str
    label: str
    amount: float
    currency: str = "TND"
    date: str
    deadline: str = ""
    notes: str = ""
    status: str = "open"
    createdAt: int = Field(default=0, alias="createdAt")

    model_config = {"populate_by_name": True}


class FundSplits(BaseModel):
    commitments: float = 40
    personal: float = 20
    investment: float = 40


class SettingsIn(BaseModel):
    language: str | None = None
    theme: str | None = None
    salary: float | None = None
    fundSplits: FundSplits | None = None


class SettingsOut(BaseModel):
    language: str
    theme: str
    salary: float
    fundSplits: FundSplits

