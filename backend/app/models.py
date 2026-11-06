from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Float, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# Money: exact decimal with 3 places (TND has 3 decimals). Never use Float for money.
Money = Numeric(12, 3)


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Money, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    notes: Mapped[str] = mapped_column(String, default="")
    recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    kind: Mapped[str] = mapped_column(String(32), default="normal")
    payment_method: Mapped[str] = mapped_column(String(16), default="bank")
    card_settled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")


class MonthlyFund(Base):
    __tablename__ = "monthly_funds"

    year_month: Mapped[str] = mapped_column(String(7), primary_key=True)
    commitments: Mapped[Decimal] = mapped_column(Money, default=0)
    personal: Mapped[Decimal] = mapped_column(Money, default=0)
    investment: Mapped[Decimal] = mapped_column(Money, default=0)


class Debt(Base):
    __tablename__ = "debts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Money, nullable=False)
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
    salary: Mapped[Decimal] = mapped_column(Money, default=0)
    fund_splits_commitments: Mapped[float] = mapped_column(Float, default=40)
    fund_splits_personal: Mapped[float] = mapped_column(Float, default=20)
    fund_splits_investment: Mapped[float] = mapped_column(Float, default=40)
    cash_balance_offset: Mapped[Decimal] = mapped_column(Money, default=0, server_default="0")


class CategoryRule(Base):
    """A learned link "word -> category" used by the quick-add parser.

    `keyword` is normalized (lowercase, Arabic letters unified, see
    app/text.py). The same keyword can point to several categories; the one
    with the most `hits` wins.
    """

    __tablename__ = "category_rules"
    __table_args__ = (UniqueConstraint("keyword", "category", name="uq_category_rules_keyword_category"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    keyword: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    hits: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
