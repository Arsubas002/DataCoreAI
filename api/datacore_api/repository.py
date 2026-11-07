"""Puerto de lectura y adaptador demo inmutable; jamás importa database/services."""

from datetime import date, timedelta
from importlib.resources import files
from typing import Protocol
from .models import (
    Answer,
    AssistantRequest,
    DailyRevenue,
    Product,
    Report,
    SalePreview,
    SalePreviewRequest,
    SaleLine,
    Snapshot,
    Summary,
)

MAX_DAYS = 366


class DemoRuleError(ValueError):
    """Error de negocio seguro para mostrar sin entradas del cliente."""


def validate_period(start: date, end: date) -> None:
    if start > end or (end - start).days >= MAX_DAYS:
        raise DemoRuleError("El periodo debe ser válido y tener como máximo 366 días.")


class ReadRepository(Protocol):
    def snapshot(self) -> Snapshot: ...
    def summary(self, start: date, end: date) -> Summary: ...


class DemoRepository:
    def __init__(self):
        self._data = Snapshot.model_validate_json(
            files("api.datacore_api.resources").joinpath("demo-v1.json").read_bytes()
        )

    def snapshot(self) -> Snapshot:
        return self._data

    def products(self, q: str = "", category: str | None = None) -> tuple[Product, ...]:
        query = q.strip().casefold()
        return tuple(
            p
            for p in self._data.products
            if (not query or query in p.name.casefold() or query in p.code.casefold())
            and (category is None or p.category == category)
        )

    def summary(self, start: date, end: date) -> Summary:
        validate_period(start, end)
        sales = tuple(s for s in self._data.sales if start <= s.day <= end)
        daily = tuple(
            DailyRevenue(
                day=day,
                revenue_minor=sum(s.total_minor for s in sales if s.day == day),
                sales_count=sum(s.day == day for s in sales),
            )
            for day in (
                start + timedelta(days=n) for n in range((end - start).days + 1)
            )
        )
        return Summary(
            start=start,
            end=end,
            revenue_minor=sum(s.total_minor for s in sales),
            sales_count=len(sales),
            stock_units=sum(p.stock for p in self._data.products),
            alert_count=sum(p.stock <= p.minimum_stock for p in self._data.products),
            daily=daily,
        )

    def preview(self, request: SalePreviewRequest) -> SalePreview:
        ids = [line.product_id for line in request.lines]
        if len(set(ids)) != len(ids):
            raise DemoRuleError(
                "Agrupa las cantidades de cada producto en una sola línea."
            )
        products = {p.id: p for p in self._data.products}
        lines = []
        for line in request.lines:
            product = products.get(line.product_id)
            if not product or line.quantity > product.stock:
                raise DemoRuleError(
                    "Producto no disponible o stock insuficiente en la demostración."
                )
            lines.append(
                SaleLine(
                    product_id=product.id,
                    quantity=line.quantity,
                    unit_price_minor=product.price_minor,
                )
            )
        total = sum(line.subtotal_minor for line in lines)
        if total > 999_999_999_999:
            raise DemoRuleError("El total excede el límite permitido.")
        return SalePreview(lines=tuple(lines), total_minor=total)

    def report(self, start: date, end: date) -> Report:
        return Report(summary=self.summary(start, end), inventory=self._data.products)

    def answer(self, request: AssistantRequest) -> Answer:
        summary = self.summary(request.start, request.end)
        sales = [s for s in self._data.sales if request.start <= s.day <= request.end]
        if request.question == "revenue":
            text = f"Ingresos: S/ {summary.revenue_minor // 100}.{summary.revenue_minor % 100:02}; {summary.sales_count} ventas ficticias."
        elif request.question == "average":
            # Decimal avoids binary rounding even for a display-only average.
            from decimal import Decimal, ROUND_HALF_UP

            text = (
                "El ticket promedio no está definido sin ventas."
                if not sales
                else f"Ticket promedio: S/ {(Decimal(summary.revenue_minor) / 100 / len(sales)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}."
            )
        elif request.question == "stock_alerts":
            text = f"Hay {summary.alert_count} productos con stock menor o igual al mínimo actual."
        else:
            counts: dict[str, int] = {}
            for sale in sales:
                for line in sale.lines:
                    counts[line.product_id] = (
                        counts.get(line.product_id, 0) + line.quantity
                    )
            names = {p.id: p.name for p in self._data.products}
            text = (
                "; ".join(
                    f"{names[key]}: {value} unidades"
                    for key, value in sorted(
                        counts.items(), key=lambda pair: (-pair[1], pair[0])
                    )[:3]
                )
                or "No hay productos vendidos en este periodo."
            )
        return Answer(
            question=request.question,
            text=text,
            sources=(
                "Fixture demo v1; no es información real.",
                f"Ventas inclusivas: {request.start.isoformat()} a {request.end.isoformat()}.",
                f"Existencias actuales del fixture: {self._data.as_of.isoformat()}.",
            ),
        )
