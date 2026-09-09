#!/usr/bin/env python3
"""Batch OCR Pipeline Test Runner.

Usage
-----
    # Run all document types
    python testing/run_tests.py

    # Run only specific types
    python testing/run_tests.py --types passport aadhaar pan

    # Run and show flat fields only (no full JSON)
    python testing/run_tests.py --flat

    # Use custom image / output paths
    python testing/run_tests.py --images /path/to/my_images --output /path/to/results

Output structure
----------------
    test_outputs/
        passport/
            sample1.json         ← full adapted + raw result
            sample2.json
        aadhaar/
            card1.json
        ...
        _summary.json            ← aggregate run report
"""
from __future__ import annotations

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import argparse
import json
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Bootstrap path
# ---------------------------------------------------------------------------
_AI_SERVICES = Path(__file__).resolve().parent.parent
if str(_AI_SERVICES) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICES))

from testing.config import IMAGES_ROOT, OUTPUTS_ROOT, IMAGE_EXTENSIONS, INCLUDE_RAW_OUTPUT, FAIL_FAST, _get_processors


# ---------------------------------------------------------------------------
# Result dataclasses (plain dicts, no external deps)
# ---------------------------------------------------------------------------

def _make_case_result(
    image_path: Path,
    doc_type: str,
    status: str,
    adapted: dict | None,
    raw: dict | None,
    error: str | None,
    elapsed_ms: float,
) -> dict[str, Any]:
    return {
        "image": image_path.name,
        "doc_type": doc_type,
        "status": status,          # "ok" | "error"
        "elapsed_ms": round(elapsed_ms, 1),
        "error": error,
        "adapted_result": adapted,
        "raw_result": raw if INCLUDE_RAW_OUTPUT else None,
    }


# ---------------------------------------------------------------------------
# Core runner
# ---------------------------------------------------------------------------

def run_single(
    image_path: Path,
    doc_type: str,
    processor_fn,
    processor_kwargs: dict,
) -> dict[str, Any]:
    """Process one image and return a case-result dict."""
    from ocr.adapter import adapt_result

    t0 = time.perf_counter()
    try:
        raw = processor_fn(image_path, **processor_kwargs)
        adapted = adapt_result(raw).to_dict()
        elapsed = (time.perf_counter() - t0) * 1000
        return _make_case_result(
            image_path=image_path,
            doc_type=doc_type,
            status="ok",
            adapted=adapted,
            raw=raw,
            error=None,
            elapsed_ms=elapsed,
        )
    except Exception as exc:
        elapsed = (time.perf_counter() - t0) * 1000
        return _make_case_result(
            image_path=image_path,
            doc_type=doc_type,
            status="error",
            adapted=None,
            raw=None,
            error=f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}",
            elapsed_ms=elapsed,
        )


def run_doc_type(
    doc_type: str,
    images_dir: Path,
    outputs_dir: Path,
    processor_fn,
    processor_kwargs: dict,
    verbose: bool = True,
) -> list[dict[str, Any]]:
    """Process all images in ``images_dir`` for a given document type."""
    results = []

    image_files = sorted(
        f for f in images_dir.iterdir()
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
    )

    if not image_files:
        if verbose:
            print(f"  [SKIP] No images found in {images_dir}")
        return results

    outputs_dir.mkdir(parents=True, exist_ok=True)

    for img_path in image_files:
        if verbose:
            print(f"  Processing {img_path.name} ...", end=" ", flush=True)

        result = run_single(img_path, doc_type, processor_fn, processor_kwargs)
        results.append(result)

        # Save individual JSON output
        out_file = outputs_dir / (img_path.stem + ".json")
        out_file.write_text(
            json.dumps(result, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        if verbose:
            if result["status"] == "ok":
                conf = result["adapted_result"].get("aggregate_confidence", 0.0)
                n_fields = sum(
                    1 for v in result["adapted_result"].get("extracted_fields", {}).values()
                    if v.get("value") is not None
                )
                print(f"OK  conf={conf:.2f}  fields_found={n_fields}  {result['elapsed_ms']:.0f}ms")
            else:
                print(f"ERROR  {result['elapsed_ms']:.0f}ms")
                first_line = result["error"].splitlines()[0] if result["error"] else ""
                print(f"       {first_line}")

        if FAIL_FAST and result["status"] == "error":
            break

    return results


def build_summary(all_results: dict[str, list[dict]], elapsed_total_s: float) -> dict:
    """Build aggregated summary across all document types."""
    summary: dict[str, Any] = {
        "run_timestamp": datetime.now(timezone.utc).isoformat(),
        "total_elapsed_seconds": round(elapsed_total_s, 2),
        "per_type": {},
        "totals": {"cases": 0, "ok": 0, "errors": 0},
    }

    for doc_type, results in all_results.items():
        ok = [r for r in results if r["status"] == "ok"]
        errors = [r for r in results if r["status"] == "error"]
        avg_conf = (
            sum(r["adapted_result"]["aggregate_confidence"] for r in ok) / len(ok)
            if ok else 0.0
        )
        avg_ms = (
            sum(r["elapsed_ms"] for r in results) / len(results)
            if results else 0.0
        )
        summary["per_type"][doc_type] = {
            "total": len(results),
            "ok": len(ok),
            "errors": len(errors),
            "avg_confidence": round(avg_conf, 4),
            "avg_elapsed_ms": round(avg_ms, 1),
            "error_cases": [r["image"] for r in errors],
        }
        summary["totals"]["cases"] += len(results)
        summary["totals"]["ok"] += len(ok)
        summary["totals"]["errors"] += len(errors)

    return summary


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Batch OCR Pipeline Test Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "--types", nargs="+", metavar="TYPE",
        help="Limit to these doc types (folder names). Default: all sub-folders.",
    )
    p.add_argument(
        "--images", type=Path, default=None,
        help=f"Override images root (default: {IMAGES_ROOT})",
    )
    p.add_argument(
        "--output", type=Path, default=None,
        help=f"Override outputs root (default: {OUTPUTS_ROOT})",
    )
    p.add_argument("--flat", action="store_true", help="Print flat field values to console.")
    p.add_argument("--quiet", action="store_true", help="Suppress per-file output.")
    return p.parse_args()


def main() -> None:
    args = parse_args()

    images_root = args.images or IMAGES_ROOT
    outputs_root = args.output or OUTPUTS_ROOT

    print("\n" + "=" * 60)
    print(" OCR Pipeline Batch Test Runner")
    print("=" * 60)
    print(f" Images root : {images_root}")
    print(f" Outputs root: {outputs_root}")
    print("=" * 60 + "\n")

    # Load processors (triggers model init once)
    print("Loading processors & models ...")
    processors = _get_processors()
    print("Done.\n")

    # Discover document types to process
    if args.types:
        doc_types = [t.lower() for t in args.types]
    else:
        doc_types = [
            d.name for d in sorted(images_root.iterdir())
            if d.is_dir() and d.name in processors
        ]

    if not doc_types:
        print("No matching document type sub-folders found under:", images_root)
        sys.exit(0)

    all_results: dict[str, list[dict]] = {}
    t_start = time.perf_counter()

    for doc_type in doc_types:
        images_dir = images_root / doc_type
        outputs_dir = outputs_root / doc_type

        if not images_dir.exists():
            print(f"[{doc_type.upper()}] images dir not found, skipping: {images_dir}")
            continue

        if doc_type not in processors:
            print(f"[{doc_type.upper()}] no processor registered, skipping.")
            continue

        processor_fn, processor_kwargs = processors[doc_type]
        print(f"[{doc_type.upper()}]  {images_dir}")

        results = run_doc_type(
            doc_type=doc_type,
            images_dir=images_dir,
            outputs_dir=outputs_dir,
            processor_fn=processor_fn,
            processor_kwargs=processor_kwargs,
            verbose=not args.quiet,
        )
        all_results[doc_type] = results

        # Optional: print flat fields
        if args.flat:
            from ocr.adapter import adapt_result
            for r in results:
                if r["status"] == "ok" and r["adapted_result"]:
                    print(f"\n  --- {r['image']} flat fields ---")
                    for k, v in r["adapted_result"].get("extracted_fields", {}).items():
                        val = v.get("value")
                        if val:
                            print(f"    {k}: {val}")

        print()

    total_elapsed = time.perf_counter() - t_start
    summary = build_summary(all_results, total_elapsed)

    # Write summary
    outputs_root.mkdir(parents=True, exist_ok=True)
    summary_path = outputs_root / "_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    # Print summary table
    print("=" * 60)
    print(" SUMMARY")
    print("=" * 60)
    print(f"{'Type':<20} {'Cases':>6} {'OK':>4} {'Errors':>7} {'Avg Conf':>9} {'Avg ms':>8}")
    print("-" * 60)
    for dt, s in summary["per_type"].items():
        print(
            f"{dt:<20} {s['total']:>6} {s['ok']:>4} {s['errors']:>7} "
            f"{s['avg_confidence']:>9.3f} {s['avg_elapsed_ms']:>8.0f}"
        )
    t = summary["totals"]
    print("-" * 60)
    print(f"{'TOTAL':<20} {t['cases']:>6} {t['ok']:>4} {t['errors']:>7}")
    print(f"\nTotal elapsed: {total_elapsed:.1f}s")
    print(f"Summary written: {summary_path}")
    print("=" * 60 + "\n")

    if t["errors"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
