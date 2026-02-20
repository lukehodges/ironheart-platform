#!/usr/bin/env python3
"""Convert Drizzle ORM snapshot JSON → Prisma schema for visualization."""

import json, re, sys
from collections import defaultdict
from pathlib import Path

SNAPSHOT = Path(__file__).parent.parent / "drizzle/meta/0002_snapshot.json"
OUTPUT   = Path(__file__).parent.parent / "prisma/schema.prisma"

# ── Type mapping ─────────────────────────────────────────────────────────────

def pg_to_prisma(col_type: str, not_null: bool) -> str:
    opt = "" if not_null else "?"
    t = col_type.lower().strip()

    # arrays
    if t in ("uuid[]", "text[]", "varchar[]", "character varying[]"):
        return "String[]"

    if t == "uuid":                 return f"String{opt}  @db.Uuid"
    if t in ("text", "citext"):     return f"String{opt}"
    if t.startswith("varchar") or t.startswith("character varying"):
        return f"String{opt}"
    if t in ("integer", "int", "int4", "int2", "smallint"):
        return f"Int{opt}"
    if t in ("bigint", "int8"):     return f"BigInt{opt}"
    if t == "boolean":              return f"Boolean{opt}"
    if t == "date":                 return f"DateTime{opt}  @db.Date"
    if t.startswith("timestamp"):   return f"DateTime{opt}"
    if t in ("jsonb", "json"):      return f"Json{opt}"
    if t.startswith("numeric") or t in ("decimal", "float4", "float8", "real", "double precision"):
        return f"Decimal{opt}"

    return f"String{opt}  // {col_type}"

# ── Naming helpers ────────────────────────────────────────────────────────────

def to_pascal(name: str) -> str:
    """add_ons → AddOns, users → Users"""
    return "".join(p.capitalize() for p in re.split(r"[_\s]+", name) if p)

def to_camel(name: str) -> str:
    """some_field → someField"""
    parts = name.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])

# ── Main conversion ───────────────────────────────────────────────────────────

def convert(snapshot_path: Path, output_path: Path):
    data = json.loads(snapshot_path.read_text())
    tables = data["tables"]
    enums  = data.get("enums", {})

    lines: list[str] = []

    # ── Header ──
    lines += [
        'generator client {',
        '  provider = "prisma-client-js"',
        '}',
        '',
        'datasource db {',
        '  provider = "postgresql"',
        '  url      = env("DATABASE_URL")',
        '}',
        '',
    ]

    # ── Enums ──
    for enum_key, enum_def in sorted(enums.items()):
        raw_name = enum_def.get("name", enum_key.split(".")[-1])
        model_name = to_pascal(raw_name)
        lines.append(f"enum {model_name} {{")
        for val in enum_def.get("values", []):
            lines.append(f"  {val}")
        lines.append("}")
        lines.append("")

    # ── Build FK lookup: tableName → list of FK defs ──
    # Also track back-relations so we can add them on the referenced model.
    # relation_name_counters tracks (tableFrom, tableTo) → count for disambiguation
    back_relations: dict[str, list[dict]] = defaultdict(list)
    # Maps (tableFrom, fk_name) → relation_name
    relation_name_map: dict[tuple, str] = {}
    pair_counters: dict[tuple, int] = defaultdict(int)

    for tbl_key, tbl in tables.items():
        tbl_name = tbl["name"]
        for fk_name, fk in tbl.get("foreignKeys", {}).items():
            table_from  = fk["tableFrom"]
            table_to    = fk["tableTo"]
            cols_from   = fk["columnsFrom"]
            cols_to     = fk["columnsTo"]
            on_delete   = fk.get("onDelete", "NoAction")
            on_update   = fk.get("onUpdate", "NoAction")

            # Assign a unique relation name if needed
            pair = (table_from, table_to)
            pair_counters[pair] += 1
            count = pair_counters[pair]
            rel_name = f"{to_pascal(table_from)}_{to_pascal(table_to)}"
            if table_from == table_to:
                rel_name = f"{to_pascal(table_from)}_self_{fk_name}"
            elif count > 1:
                rel_name = f"{rel_name}_{count}"

            relation_name_map[(table_from, fk_name)] = rel_name

            back_relations[table_to].append({
                "rel_name":   rel_name,
                "table_from": table_from,
                "cols_from":  cols_from,
                "cols_to":    cols_to,
            })

    # ── Emit models ──
    for tbl_key in sorted(tables.keys()):
        tbl      = tables[tbl_key]
        tbl_name = tbl["name"]
        model    = to_pascal(tbl_name)
        columns  = tbl.get("columns", {})
        fks      = tbl.get("foreignKeys", {})
        pk_cols  = [c for c, d in columns.items() if d.get("primaryKey")]
        comp_pks = tbl.get("compositePrimaryKeys", {})
        uniques  = tbl.get("uniqueConstraints", {})

        lines.append(f"model {model} {{")

        # ── Build FK column index for quick lookup ──
        col_to_fk: dict[str, dict] = {}  # col_name → fk_def
        for fk_name, fk in fks.items():
            for col in fk["columnsFrom"]:
                col_to_fk[col] = fk

        # ── Columns ──
        for col_name, col in columns.items():
            ptype     = pg_to_prisma(col["type"], col.get("notNull", False))
            is_pk     = col.get("primaryKey", False)
            default   = col.get("default")
            field_name = col_name  # keep original casing (matches Drizzle)

            attrs = []
            if is_pk and not comp_pks:
                attrs.append("@id")
            if col.get("isUnique"):
                attrs.append("@unique")
            if default is not None:
                if isinstance(default, bool):
                    attrs.append(f"@default({'true' if default else 'false'})")
                elif isinstance(default, (int, float)):
                    attrs.append(f"@default({default})")
                elif str(default).upper() in ("CURRENT_TIMESTAMP", "NOW()"):
                    attrs.append("@default(now())")
                elif str(default).startswith("gen_random_uuid") or str(default).startswith("uuid_generate"):
                    attrs.append("@default(uuid())")
                elif isinstance(default, str):
                    safe = default.replace('"', '\\"')
                    attrs.append(f'@default("{safe}")')

            # @map if col name differs from field name (rarely needed here)
            attr_str = "  " + "  ".join(attrs) if attrs else ""
            lines.append(f"  {field_name}  {ptype}{attr_str}")

        # ── Relation fields (FK side) ──
        emitted_rel_fields: set[str] = set()
        for fk_name, fk in fks.items():
            rel_name   = relation_name_map.get((tbl_name, fk_name), f"fk_{fk_name}")
            ref_model  = to_pascal(fk["tableTo"])
            cols_from  = fk["columnsFrom"]
            cols_to    = fk["columnsTo"]
            on_delete  = fk.get("onDelete", "NoAction")

            field_name = fk["tableTo"]  # e.g. "tenants"
            # disambiguate if multiple FKs to same table
            if field_name in emitted_rel_fields:
                field_name = f"{fk['tableTo']}_{cols_from[0]}"
            emitted_rel_fields.add(field_name)

            fields_str  = ", ".join(f'"{c}"' for c in cols_from)
            refs_str    = ", ".join(f'"{c}"' for c in cols_to)
            rel_attr    = f'@relation("{rel_name}", fields: [{fields_str}], references: [{refs_str}], onDelete: {on_delete.capitalize()})'
            # nullable if any FK col is nullable
            opt = ""  # already encoded in the column
            lines.append(f"  {field_name}  {ref_model}  {rel_attr}")

        # ── Back-relation fields (other side) ──
        back = back_relations.get(tbl_name, [])
        emitted_back: set[str] = set()
        for br in back:
            ref_model  = to_pascal(br["table_from"])
            rel_name   = br["rel_name"]
            field_name = br["table_from"]  # e.g. "users"
            if field_name in emitted_back:
                field_name = f"{br['table_from']}_{br['cols_from'][0]}"
            emitted_back.add(field_name)
            lines.append(f"  {field_name}  {ref_model}[]  @relation(\"{rel_name}\")")

        # ── Composite PK ──
        if comp_pks:
            for cpk in comp_pks.values():
                cols = ", ".join(cpk.get("columns", []))
                lines.append(f"  @@id([{cols}])")

        # ── Unique indexes ──
        seen_unique_cols: set[str] = set()
        for ui_name, ui in uniques.items():
            cols = ui.get("columns", [])
            if len(cols) == 1 and cols[0] in seen_unique_cols:
                continue
            col_str = ", ".join(cols)
            lines.append(f"  @@unique([{col_str}])")
            seen_unique_cols.update(cols)

        lines.append(f"  @@map(\"{tbl_name}\")")
        lines.append("}")
        lines.append("")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines))
    print(f"✓ Written {len([l for l in lines if l.startswith('model ')])}"
          f" models + {len([l for l in lines if l.startswith('enum ')])}"
          f" enums → {output_path}")

if __name__ == "__main__":
    convert(SNAPSHOT, OUTPUT)
