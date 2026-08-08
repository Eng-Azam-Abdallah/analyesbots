#!/usr/bin/env python3
"""Compare production DB prices with live source APIs. Run on the VPS."""
from __future__ import annotations

import csv
import io
import json
import subprocess
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def load_env(path: str) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if "=" not in line or line.strip().startswith("#"):
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def fetch_json(url: str, headers: dict[str, str]) -> Any:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def as_list(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if not isinstance(data, dict):
        return []
    for key in ("products", "data", "items", "result"):
        value = data.get(key)
        if isinstance(value, list):
            return [x for x in value if isinstance(x, dict)]
        if isinstance(value, dict):
            for inner in ("products", "data", "items"):
                nested = value.get(inner)
                if isinstance(nested, list):
                    return [x for x in nested if isinstance(x, dict)]
    return []


def load_db_rows() -> list[dict[str, str]]:
    sql = (
        'COPY ('
        ' SELECT b.username, p."externalKey", p.title,'
        ' p."currentPrice"::float8, p."rawPayload"::text'
        ' FROM "Product" p JOIN "Bot" b ON b.id=p."botId"'
        ' WHERE p."isActive"=true'
        ') TO STDOUT WITH CSV HEADER'
    )
    proc = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-d", "analyes", "-c", sql],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[:500])
    return list(csv.DictReader(io.StringIO(proc.stdout)))


def compare(
    label: str,
    db_rows: list[dict[str, str]],
    remote: dict[str, float],
) -> tuple[str, list[tuple]]:
    ok = 0
    miss = 0
    samples: list[tuple] = []
    for row in db_rows:
        key = row["externalKey"]
        if key not in remote:
            miss += 1
            continue
        dbp = float(row["currentPrice"])
        rp = remote[key]
        if abs(dbp - rp) > 1e-6:
            samples.append((label, row["title"][:45], dbp, rp))
        else:
            ok += 1
    summary = (
        f"{label}: ok={ok} mismatch={len(samples)} "
        f"missing_remote={miss} remote_n={len(remote)} db_n={len(db_rows)}"
    )
    return summary, samples


def main() -> int:
    env = load_env("/var/www/analyes/backend/.env")
    rows = load_db_rows()
    print(f"DB_ROWS {len(rows)}")
    by: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by[row["username"]].append(row)

    checks: list[str] = []
    mismatches: list[tuple] = []

    # ShopDigital / Kokoro
    try:
        base = (env.get("SHOPDIGITAL_API_URL") or "").rstrip("/")
        key = env.get("SHOPDIGITAL_API_KEY", "")
        data = fetch_json(
            f"{base}/products",
            {
                "Authorization": f"Bearer {key}",
                "Accept": "application/json",
                "User-Agent": "AnalyesAudit/1.0",
            },
        )
        remote = {
            str(p["id"]): float(p["price"])
            for p in as_list(data)
            if p.get("id") is not None and p.get("price") is not None
        }
        summary, samples = compare("KokoroShop", by.get("KokoroShop", []), remote)
        checks.append(summary)
        mismatches.extend(samples[:12])
    except Exception as exc:  # noqa: BLE001
        checks.append(f"KokoroShop ERR: {exc}")

    # TechnySoft
    try:
        base = (env.get("TECHNYSOFT_API_URL") or "").rstrip("/")
        key = env.get("TECHNYSOFT_API_KEY", "")
        url = f"{base}/v1/products" if not base.endswith("/products") else base
        data = fetch_json(
            url,
            {
                "Authorization": f"Bearer {key}",
                "X-API-Key": key,
                "Accept": "application/json",
                "User-Agent": "AnalyesAudit/1.0",
            },
        )
        remote = {}
        for p in as_list(data):
            pid = str(p.get("id") or p.get("product_id") or "")
            price = p.get("price_usd", p.get("price"))
            if pid and price is not None:
                remote[pid] = float(price)
        summary, samples = compare("mkeshopbot", by.get("mkeshopbot", []), remote)
        checks.append(summary)
        mismatches.extend(samples[:12])
    except Exception as exc:  # noqa: BLE001
        checks.append(f"mkeshopbot ERR: {exc}")

    # Qamify
    try:
        base = (env.get("QAMIFY_API_URL") or "").rstrip("/")
        key = env.get("QAMIFY_API_KEY", "")
        data = fetch_json(
            f"{base}/products",
            {
                "Authorization": f"Bearer {key}",
                "X-API-Key": key,
                "Accept": "application/json",
                "User-Agent": "AnalyesAudit/1.0",
            },
        )
        remote = {}
        for p in as_list(data):
            pid = str(p.get("id") or p.get("product_id") or "")
            price = p.get("unit_price")
            if price is None and p.get("unit_price_cents") is not None:
                price = float(p["unit_price_cents"]) / 100
            if pid and price is not None:
                remote[pid] = float(price)
        summary, samples = compare("Qamify", by.get("Qamify", []), remote)
        checks.append(summary)
        mismatches.extend(samples[:12])
    except Exception as exc:  # noqa: BLE001
        checks.append(f"Qamify ERR: {exc}")

    # Telegram Buyer
    try:
        base = (env.get("TELEGRAM_BUYER_API_URL") or "").rstrip("/")
        key = env.get("TELEGRAM_BUYER_API_KEY", "")
        data = fetch_json(
            f"{base}/products",
            {
                "Authorization": f"Bearer {key}",
                "Accept": "application/json",
                "User-Agent": "AnalyesAudit/1.0",
            },
        )
        remote = {}
        for p in as_list(data):
            pid = str(p.get("id") or "")
            price = p.get("price")
            if pid and price is not None:
                remote[pid] = float(price)
        summary, samples = compare(
            "TelegramBuyer", by.get("TelegramBuyer", []), remote
        )
        checks.append(summary)
        mismatches.extend(samples[:12])
    except Exception as exc:  # noqa: BLE001
        checks.append(f"TelegramBuyer ERR: {exc}")

    # Vexoran
    try:
        base = (env.get("VEXORAN_API_URL") or "").rstrip("/")
        key = env.get("VEXORAN_API_KEY", "")
        sep = "&" if "?" in base else "?"
        url = base if "action=" in base else f"{base}{sep}action=products"
        data = fetch_json(
            url,
            {
                "Authorization": f"Bearer {key}",
                "X-API-Key": key,
                "Accept": "application/json",
                "User-Agent": "AnalyesAudit/1.0",
            },
        )
        remote = {}
        for p in as_list(data):
            pid = str(p.get("id") or "")
            price = p.get("wholesale_price", p.get("price"))
            if pid and price is not None:
                remote[pid] = float(price)
        summary, samples = compare(
            "VexoranShoppieBot", by.get("VexoranShoppieBot", []), remote
        )
        checks.append(summary)
        mismatches.extend(samples[:12])
    except Exception as exc:  # noqa: BLE001
        checks.append(f"Vexoran ERR: {exc}")

    # Reseller / Rexovaan
    try:
        base = (env.get("RESELLER_API_URL") or "").rstrip("/")
        key = env.get("RESELLER_API_KEY", "")
        last_err = None
        data = None
        for path in ("/products", "/v1/products", "/api/products"):
            try:
                data = fetch_json(
                    f"{base}{path}",
                    {
                        "Authorization": f"Bearer {key}",
                        "X-API-Key": key,
                        "Accept": "application/json",
                        "User-Agent": "AnalyesAudit/1.0",
                    },
                )
                break
            except Exception as exc:  # noqa: BLE001
                last_err = exc
        if data is None:
            raise RuntimeError(last_err)
        remote = {}
        for p in as_list(data):
            pid = str(p.get("id") or "")
            price = p.get("wholesale_price", p.get("price"))
            if pid and price is not None:
                remote[pid] = float(price)
        summary, samples = compare(
            "RexovaanShoppieBot", by.get("RexovaanShoppieBot", []), remote
        )
        checks.append(summary)
        mismatches.extend(samples[:12])
    except Exception as exc:  # noqa: BLE001
        checks.append(f"Rexovaan ERR: {exc}")

    # rawPayload vs currentPrice
    raw_mismatch: list[tuple] = []
    for row in rows:
        try:
            raw = json.loads(row["rawPayload"])
        except Exception:
            continue
        dbp = float(row["currentPrice"])
        preferred = None
        for key in (
            "wholesale_price",
            "unit_price",
            "price_usd",
            "price",
        ):
            if key in raw and raw[key] is not None:
                try:
                    preferred = (key, float(raw[key]))
                    break
                except Exception:
                    pass
        if preferred is None and raw.get("unit_price_cents") is not None:
            preferred = (
                "unit_price_cents/100",
                float(raw["unit_price_cents"]) / 100,
            )
        if preferred and abs(preferred[1] - dbp) > 1e-6:
            raw_mismatch.append(
                (
                    row["username"],
                    row["title"][:40],
                    dbp,
                    preferred[0],
                    preferred[1],
                )
            )

    print("CHECKS")
    for item in checks:
        print(" ", item)
    print(f"LIVE_MISMATCHES {len(mismatches)}")
    for item in mismatches[:30]:
        print(" ", item)
    print(f"RAW_VS_CURRENT {len(raw_mismatch)}")
    print(" raw by bot", dict(Counter(item[0] for item in raw_mismatch)))
    for item in raw_mismatch[:30]:
        print(" ", item)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
