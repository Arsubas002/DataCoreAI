"""Respuestas verificables a consultas predefinidas; no genera ni ejecuta SQL."""
from decimal import Decimal, ROUND_HALF_UP

PREGUNTAS = ("¿Cuánto vendimos en el periodo?", "¿Cuál es el ticket promedio?",
             "¿Qué productos se vendieron más?", "¿Qué productos tienen stock bajo?")


def responder(pregunta, datos):
    """Devuelve texto y evidencia tabular sin inferir márgenes ni pronósticos."""
    if pregunta not in PREGUNTAS:
        raise ValueError("Selecciona una de las consultas disponibles.")
    ventas = datos["ventas"]
    if pregunta == PREGUNTAS[0]:
        total = Decimal(str(ventas["TotalVentas"]))
        return f"Ingresos del periodo: S/ {total:,.2f}. Ventas registradas: {ventas['NumeroVentas']}.", []
    if pregunta == PREGUNTAS[1]:
        cantidad = ventas["NumeroVentas"]
        if cantidad == 0:
            return "No hay ventas en el periodo; el ticket promedio no está definido.", []
        promedio = (Decimal(str(ventas["TotalVentas"])) / Decimal(cantidad)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP)
        return f"Ticket promedio: S/ {promedio:,.2f}. Fórmula: ingresos del periodo / número de ventas.", []
    if pregunta == PREGUNTAS[2]:
        filas = datos["productos_vendidos"]
        return ("Ranking de hasta 8 productos por unidades vendidas; nombres actuales."
                if filas else "No hay productos vendidos en el periodo."), filas
    filas = [p for p in datos["inventario"] if p["Existencias"] <= p["StockMinimo"]]
    return f"Hay {len(filas)} producto(s) activos con stock bajo o agotado. Se usan existencias actuales, no históricas.", filas
