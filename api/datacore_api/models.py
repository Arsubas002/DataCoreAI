"""Contratos v1: importes PEN expresados en céntimos enteros, nunca floats."""

from datetime import date
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator

Minor = Annotated[StrictInt, Field(ge=0, le=999_999_999_999)]
Quantity = Annotated[StrictInt, Field(ge=1, le=999)]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Product(Contract):
    id: str = Field(min_length=1, max_length=64)
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=80)
    price_minor: Minor
    stock: Annotated[StrictInt, Field(ge=0, le=1_000_000)]
    minimum_stock: Annotated[StrictInt, Field(ge=0, le=1_000_000)]


class SaleLine(Contract):
    product_id: str = Field(min_length=1, max_length=64)
    quantity: Quantity
    unit_price_minor: Minor

    @property
    def subtotal_minor(self) -> int:
        return self.quantity * self.unit_price_minor


class Sale(Contract):
    id: str = Field(min_length=1, max_length=64)
    day: date
    lines: tuple[SaleLine, ...] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def bounded_total(self):
        if self.total_minor > 999_999_999_999:
            raise ValueError("Importe fuera de rango")
        return self

    @property
    def total_minor(self) -> int:
        return sum(line.subtotal_minor for line in self.lines)


class Snapshot(Contract):
    version: Literal[1]
    mode: Literal["demo"]
    currency: Literal["PEN"]
    as_of: date
    products: tuple[Product, ...] = Field(max_length=5000)
    sales: tuple[Sale, ...] = Field(max_length=5000)

    @model_validator(mode="after")
    def references(self):
        ids = {p.id for p in self.products}
        if len(ids) != len(self.products) or len({s.id for s in self.sales}) != len(
            self.sales
        ):
            raise ValueError("Identificadores duplicados")
        if any(
            s.day > self.as_of or any(l.product_id not in ids for l in s.lines)
            for s in self.sales
        ):
            raise ValueError("Referencias inválidas")
        return self


class DailyRevenue(Contract):
    day: date
    revenue_minor: Minor
    sales_count: int = Field(ge=0)


class Summary(Contract):
    mode: Literal["demo"] = "demo"
    currency: Literal["PEN"] = "PEN"
    start: date
    end: date
    revenue_minor: Minor
    sales_count: int = Field(ge=0)
    stock_units: int = Field(ge=0)
    alert_count: int = Field(ge=0)
    daily: tuple[DailyRevenue, ...]


class CartLine(Contract):
    product_id: str = Field(min_length=1, max_length=64)
    quantity: Quantity


class SalePreviewRequest(Contract):
    lines: tuple[CartLine, ...] = Field(min_length=1, max_length=50)


class SalePreview(Contract):
    mode: Literal["demo"] = "demo"
    persisted: Literal[False] = False
    currency: Literal["PEN"] = "PEN"
    total_minor: Minor
    lines: tuple[SaleLine, ...]


Question = Literal["revenue", "average", "top_products", "stock_alerts"]


class AssistantRequest(Contract):
    question: Question
    start: date = date(2026, 11, 1)
    end: date = date(2026, 11, 7)


class Answer(Contract):
    mode: Literal["demo"] = "demo"
    question: Question
    text: str
    sources: tuple[str, ...]
    generative: Literal[False] = False


class Report(Contract):
    mode: Literal["demo"] = "demo"
    summary: Summary
    inventory: tuple[Product, ...]
    scope: str = "Ventas del periodo; existencias actuales ficticias, no históricas."
