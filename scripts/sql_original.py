"""Read the original SQL fixtures without connecting to or modifying SQL Server."""

from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SQL_FILES = (
    "01_crear_base_y_tablas.sql",
    "02_datos_prueba.sql",
    "03_solicitudes_ventas.sql",
)
STRING = r"N'((?:[^']|'')*)'"


def recover(root: Path = ROOT) -> dict:
    paths = [root / "sql" / name for name in SQL_FILES]
    sql = paths[1].read_text(encoding="utf-8")
    product_pattern = (
        r"\(" + r",\s*".join([STRING] * 3 + [r"(\d+(?:\.\d+)?)", r"(\d+)"]) + r"\)"
    )
    client_pattern = r"\(" + r",\s*".join([STRING] * 4) + r"\)"
    products = []
    for code, name, category, price, stock in re.findall(product_pattern, sql):
        products.append(
            {
                "code": code.replace("''", "'"),
                "name": name.replace("''", "'"),
                "category": category.replace("''", "'"),
                "price": price,
                "stock": int(stock),
                "min": 5,
            }
        )
    customers = [
        {
            "document": doc,
            "name": name.replace("''", "'"),
            "email": email,
            "phone": phone,
        }
        for doc, name, email, phone in re.findall(client_pattern, sql)
    ]
    category_block = re.search(r"FROM \(VALUES (.*?)\) datos\(Nombre\)", sql, re.S)
    if not category_block:
        raise ValueError("Original category fixture block missing")
    categories = re.findall(STRING, category_block[1])
    if (len(products), len(customers), len(categories)) != (20, 10, 4):
        raise ValueError(
            "Original fixture inventory changed; audit before generating public data"
        )
    if (
        len({p["code"] for p in products}) != 20
        or len({c["document"] for c in customers}) != 10
    ):
        raise ValueError("Duplicate original business keys")
    if any(p["category"] not in categories for p in products):
        raise ValueError("Original category relationship is invalid")
    return {
        "provenance": {
            "kind": "sql-script-fixtures",
            "database": "DataCoreAI",
            "connected": False,
            "salesRecovered": False,
            "branchesSupported": False,
            "numericPrimaryKeysRecovered": False,
            "files": {
                p.name: hashlib.sha256(
                    p.read_bytes().replace(b"\r\n", b"\n")
                ).hexdigest()
                for p in paths
            },
        },
        "categories": categories,
        "products": products,
        "customers": customers,
    }


def public_fixture(source: dict) -> dict:
    # Public seed data is explicitly fictional in the original SQL file.
    # Contacts stay in SQL/backend; the public catalogue needs only name/document.
    return {
        **source,
        "customers": [
            {k: c[k] for k in ("document", "name")} for c in source["customers"]
        ],
    }


def render(source: dict) -> str:
    return (
        "// Generated from the original SQL scripts by scripts/sql_original.py.\n"
        "// These are declared test fixtures, not a SQL Server export or connection.\n"
        "export const original = "
        + json.dumps(public_fixture(source), ensure_ascii=False, indent=2)
        + ";\n"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-public", action="store_true")
    parser.add_argument("--check-public", action="store_true")
    args = parser.parse_args()
    source = recover()
    target = ROOT / "pwa" / "js" / "sql-fixtures.js"
    if args.write_public:
        target.write_text(render(source), encoding="utf-8")
    if args.check_public and (
        not target.exists() or target.read_text(encoding="utf-8") != render(source)
    ):
        raise SystemExit("Public fixtures differ from the original SQL scripts")
    print(
        f"Verified original SQL fixtures: {len(source['products'])} products, "
        f"{len(source['customers'])} customers, {len(source['categories'])} categories. "
        "No SQL executed; sales and primary-key values are not recovered."
    )
