#!/usr/bin/env python3
"""Convert Drizzle ORM snapshot JSON → DBML for dbdiagram.io visualization."""

import json, re
from pathlib import Path

SNAPSHOT = Path(__file__).parent.parent / "drizzle/meta/0002_snapshot.json"
OUTPUT   = Path(__file__).parent.parent / "schema.dbml"

def pg_to_dbml(col_type: str) -> str:
    t = col_type.lower().strip()
    if t == "uuid":             return "uuid"
    if t.startswith("varchar"): return "varchar"
    if t in ("text", "citext"): return "text"
    if t in ("integer", "int", "int4", "int2", "smallint"): return "int"
    if t in ("bigint", "int8"): return "bigint"
    if t == "boolean":          return "boolean"
    if t == "date":             return "date"
    if t.startswith("timestamp"):return "timestamp"
    if t in ("jsonb", "json"):  return "jsonb"
    if t.startswith("numeric"): return "decimal"
    if t.endswith("[]"):        return t  # keep array notation
    return col_type

data    = json.loads(SNAPSHOT.read_text())
tables  = data["tables"]
enums   = data.get("enums", {})

lines = []

# Enums
for enum_key, enum_def in sorted(enums.items()):
    name = enum_def.get("name", enum_key.split(".")[-1])
    lines.append(f"Enum {name} {{")
    for val in enum_def.get("values", []):
        lines.append(f"  {val}")
    lines.append("}")
    lines.append("")

# Tables
for tbl_key in sorted(tables.keys()):
    tbl = tables[tbl_key]
    tbl_name = tbl["name"]
    columns  = tbl.get("columns", {})
    fks      = tbl.get("foreignKeys", {})
    comp_pks = tbl.get("compositePrimaryKeys", {})
    uniques  = tbl.get("uniqueConstraints", {})

    lines.append(f'Table {tbl_name} {{')

    for col_name, col in columns.items():
        dbml_type = pg_to_dbml(col["type"])
        attrs = []
        if col.get("primaryKey"):
            attrs.append("pk")
        if col.get("isUnique"):
            attrs.append("unique")
        if col.get("default") is not None:
            d = col["default"]
            if str(d).upper() in ("CURRENT_TIMESTAMP", "NOW()"):
                attrs.append("default: `now()`")
            elif isinstance(d, bool):
                attrs.append(f"default: {'true' if d else 'false'}")
            elif isinstance(d, (int, float)):
                attrs.append(f"default: {d}")
        if not col.get("notNull", True):
            attrs.append("null")

        attr_str = f" [{', '.join(attrs)}]" if attrs else ""
        lines.append(f"  {col_name} {dbml_type}{attr_str}")

    # composite PK
    for cpk in comp_pks.values():
        cols = ", ".join(cpk.get("columns", []))
        lines.append(f"  indexes {{ ({cols}) [pk] }}")

    # unique constraints
    for ui in uniques.values():
        cols = ui.get("columns", [])
        if len(cols) > 1:
            lines.append(f"  indexes {{ ({', '.join(cols)}) [unique] }}")

    lines.append("}")
    lines.append("")

# Refs (foreign keys)
lines.append("// Relationships")
for tbl_key in sorted(tables.keys()):
    tbl = tables[tbl_key]
    for fk in tbl.get("foreignKeys", {}).values():
        frm = f"{fk['tableFrom']}.{fk['columnsFrom'][0]}"
        to  = f"{fk['tableTo']}.{fk['columnsTo'][0]}"
        on_del = fk.get("onDelete", "")
        action = f" [delete: {on_del.lower()}]" if on_del and on_del.lower() not in ("no action", "noaction") else ""
        lines.append(f"Ref: {frm} > {to}{action}")

OUTPUT.write_text("\n".join(lines))
print(f"✓ {len(tables)} tables → {OUTPUT}")
print(f"  → Import at https://dbdiagram.io  (Import → DBML)")
