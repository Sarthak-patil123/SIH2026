# OCR Pipeline Testing Module

A **flexible, folder-based batch test runner** for the AI-services OCR pipeline.
Each test case is simply an image file placed in the correct sub-folder.

---

## Directory Structure

```
testing/
├── config.py               ← Edit paths & processor mapping here
├── run_tests.py            ← Main CLI test runner
├── README.md               ← This file
│
├── test_images/            ← SOURCE: place your test images here
│   ├── passport/           ← 5-6 passport images
│   ├── aadhaar/            ← 5-6 Aadhaar card images
│   ├── pan/                ← 5-6 PAN card images
│   ├── driving_license/    ← 5-6 DL images
│   ├── voter_id/           ← 5-6 Voter ID images
│   ├── dob_proof/          ← 5-6 Birth certificate / Class X images
│   └── visa/               ← 5-6 Visa sticker images
│
└── test_outputs/           ← OUTPUT: JSON results written here (auto-created)
    ├── passport/
    │   ├── sample1.json    ← adapted + raw result for each image
    │   └── ...
    ├── aadhaar/
    └── _summary.json       ← aggregate report for the whole run
```

---

## How to Run

From the **`ai-services/`** directory:

```bash
# Run all document types
python testing/run_tests.py

# Run only specific types
python testing/run_tests.py --types passport aadhaar pan

# Show flat field values in console too
python testing/run_tests.py --flat

# Use a completely different image/output folder
python testing/run_tests.py --images D:/my_docs/images --output D:/my_docs/results
```

---

## Output JSON Format

Each `<image_stem>.json` file contains:

```json
{
  "image": "passport_sample.jpg",
  "doc_type": "passport",
  "status": "ok",
  "elapsed_ms": 1234,
  "error": null,
  "adapted_result": {
    "adapter_version": "1.0",
    "document_type": "passport",
    "subtype": null,
    "country": "IND",
    "status": "success",
    "aggregate_confidence": 0.92,
    "extracted_fields": {
      "passport_number": { "value": "A1234567", "confidence": 0.97, "source": "mrz", "normalized": false },
      "surname": { "value": "SHARMA", "confidence": 0.97, "source": "mrz", "normalized": false },
      "place_of_birth": { "value": null, "confidence": 0.0, "source": "unknown", "normalized": false }
    },
    "mrz": { "is_valid": true, "mrz_type": "TD3", "raw_lines": [...], "checksums": {} },
    "validation": { "errors": [], "warnings": [] },
    "quality_warnings": [],
    "raw_ocr_count": 42
  },
  "raw_result": { ... }  // full processor output, set INCLUDE_RAW_OUTPUT=False to omit
}
```

---

## Adding New Test Cases

1. Drop image files (`.jpg`, `.png`, `.tiff`) into the relevant sub-folder under `test_images/`.
2. Re-run `python testing/run_tests.py`.
3. Results appear in the corresponding `test_outputs/<type>/` folder.

To **change the image folder** without editing code, use:
```bash
python testing/run_tests.py --images /your/custom/path
```

---

## Adapter Layer Contract

All results go through `ocr/adapter.py` which guarantees:

| Property | Guarantee |
|---|---|
| Field presence | Every canonical field is **always** in the JSON (value may be `null`) |
| No LLM calls | Pure deterministic rule extraction |
| MRZ priority | MRZ fields carry `confidence: 0.97` and override OCR fields |
| OCR fields | Visual / rule-based fields carry `confidence: 0.85` |
| Aggregate confidence | Weighted by fill-rate of required fields |

---

## Supported Document Types

| Folder name | Processor | Required canonical fields |
|---|---|---|
| `passport` | `process_passport` | passport_number, surname, given_names, dob, expiry |
| `aadhaar` | `process_national_id(id_type='aadhaar')` | aadhaar_number, name |
| `pan` | `process_national_id(id_type='pan')` | pan_number, name |
| `voter_id` | `process_national_id(id_type='voter_id')` | epic_number, name |
| `driving_license` | `process_driving_license` | dl_number, name, dob |
| `dob_proof` | `process_dob_proof` | name, date_of_birth |
| `visa` | `process_visa` | document_number, surname, expiry_date |
