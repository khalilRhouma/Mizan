from sqlalchemy import BigInteger, Boolean, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    notes: Mapped[str] = mapped_column(String, default="")
    recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    kind: Mapped[str] = mapped_column(String(32), default="normal")
    payment_method: Mapped[str] = mapped_column(String(16), default="bank")


class MonthlyFund(Base):
    __tablename__ = "monthly_funds"

    year_month: Mapped[str] = mapped_column(String(7), primary_key=True)
    commitments: Mapped[float] = mapped_column(Float, default=0)
    personal: Mapped[float] = mapped_column(Float, default=0)
    investment: Mapped[float] = mapped_column(Float, default=0)


class Debt(Base):
    __tablename__ = "debts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="TND")
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    deadline: Mapped[str] = mapped_column(String(10), default="")
    notes: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String(16), default="open")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


class AppSettings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    language: Mapped[str] = mapped_column(String(8), default="ar")
    theme: Mapped[str] = mapped_column(String(16), default="light")
    salary: Mapped[float] = mapped_column(Float, default=0)
    fund_splits_commitments: Mapped[float] = mapped_column(Float, default=40)
    fund_splits_personal: Mapped[float] = mapped_column(Float, default=20)
    fund_splits_investment: Mapped[float] = mapped_column(Float, default=40)
    cash_balance_offset: Mapped[float] = mapped_column(Float, default=0)
