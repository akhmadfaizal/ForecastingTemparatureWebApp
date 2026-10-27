"""Export bounded, reproducible teaching snapshots; never train or modify a run."""
import ast
import importlib.util
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "Dataset/sensor_ruang_04agu_sampai_20261006_120840_wib.csv"
spec = importlib.util.spec_from_file_location("pipeline_common", ROOT / "Pipeline/pipeline_training_pc_final/fungsi_bersama/common.py")
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
frame = pd.read_csv(SOURCE)
source_columns = list(frame.columns)
source_rows = len(frame)
frame["timestamp"] = pd.to_datetime(frame.waktu_wib, format="mixed", utc=True).dt.tz_convert("Asia/Jakarta")
for column in ["temperature", "humidity"]:
    frame[column] = pd.to_numeric(frame[column], errors="coerce")
numeric_frame = frame.copy()
frame = frame.dropna(subset=["timestamp", "temperature", "humidity"]).sort_values("timestamp")
start, end = pd.Timestamp("2026-08-20T00:00:00+07:00"), pd.Timestamp("2026-10-01T00:00:00+07:00")
window = frame[(frame.timestamp >= start) & (frame.timestamp < end)].copy()
artifact = (window.timestamp > pd.Timestamp("2026-08-26T09:35:15.777+07:00")) & (window.timestamp < pd.Timestamp("2026-08-26T13:18:40.717+07:00"))
clean = window.loc[~artifact & window.temperature.between(-10, 60)].drop_duplicates("timestamp")
numeric_window = numeric_frame[(numeric_frame.timestamp >= start) & (numeric_frame.timestamp < end)]
after_artifact = window.loc[~artifact]
after_range = after_artifact.loc[after_artifact.temperature.between(-10, 60)]
cleaning_steps = [
    {"id": "numeric", "name": "Validasi angka", "before": len(numeric_window), "after": len(window), "rule": "Suhu dan kelembapan harus dapat dibaca sebagai angka. Baris tanpa nilai yang valid dikeluarkan."},
    {"id": "sort", "name": "Urutkan waktu", "before": len(window), "after": len(window), "rule": "Urutkan timestamp dari paling awal ke paling akhir. Pengurutan tidak membuang baris."},
    {"id": "artifact", "name": "Keluarkan artefak", "before": len(window), "after": len(after_artifact), "rule": "Keluarkan pembacaan pada interval artefak 26 Agustus 09:35:15.777–13:18:40.717 WIB; kedua batas eksklusif."},
    {"id": "range", "name": "Periksa rentang suhu", "before": len(after_artifact), "after": len(after_range), "rule": "Pertahankan suhu dari −10 sampai 60 °C, termasuk kedua batas. Aturan ini memeriksa rentang sensor, bukan ambang peringatan 27 °C."},
    {"id": "duplicate", "name": "Hapus timestamp duplikat", "before": len(after_range), "after": len(clean), "rule": "Jika timestamp sama persis, pertahankan baris pertama. Suhu sama atau menit yang sama belum berarti duplikat."},
]
grid = clean.set_index("timestamp")[["temperature", "humidity"]].resample("5min").mean().reindex(pd.date_range(start, end, freq="5min", inclusive="left"))
lo, hi = grid.min(), grid.max()
scaled = (grid - lo) / (hi - lo)
scaled["temperature_celsius"] = grid.temperature
scaled["humidity_raw"] = grid.humidity
bounds = [("train", start, pd.Timestamp("2026-09-17T00:00:00+07:00")), ("val", pd.Timestamp("2026-09-17T00:00:00+07:00"), pd.Timestamp("2026-09-24T00:00:00+07:00")), ("test", pd.Timestamp("2026-09-24T00:00:00+07:00"), end)]
splits, segments, prepared = [], {}, []
for name, left, right in bounds:
    part = scaled[(scaled.index >= left) & (scaled.index < right)]
    filled, cells = common._interpolate_short(part, 3)
    segs = common._segments(filled, 180)
    segments[name] = segs
    prepared.append(filled)
    splits.append({"name": name, "slots": len(part), "completeBefore": int(part.notna().all(axis=1).sum()), "completeAfter": int(filled.notna().all(axis=1).sum()), "filledCells": cells, "segments": len(segs), "samples": {str(h * 5): sum(len(seg) - 144 - h + 1 for seg in segs) for h in [12, 24, 36]}})
filled_all = pd.concat(prepared)

def rows(df, columns):
    out = []
    for index, row in df.iterrows():
        timestamp = row.get("timestamp", index)
        item = {"time": timestamp.isoformat(), "label": timestamp.strftime("%d/%m %H:%M")}
        for col in columns:
            value = row[col]
            item[col] = None if pd.isna(value) else round(float(value), 6)
        out.append(item)
    return out

missing = grid.isna().any(axis=1)
groups = (missing != missing.shift()).cumsum()
gaps = [part for _, part in grid.groupby(groups) if missing.loc[part.index[0]]]
short = next((part for part in gaps if len(part) <= 3 and filled_all.loc[part.index].notna().all(axis=1).all()), None)
long = max(gaps, key=len)
def gap_example(part):
    left, right = part.index[0] - pd.Timedelta(minutes=10), part.index[-1] + pd.Timedelta(minutes=10)
    before, after = grid.loc[left:right], filled_all.loc[left:right]
    result = rows(before, ["temperature"])
    for item, value in zip(result, after.temperature_celsius):
        item["after"] = None if pd.isna(value) else round(float(value), 6)
    return {"slots": len(part), "rows": result}

segment = segments["train"][0]
feature_columns = ["temperature", "humidity", "jam_sin", "jam_cos", "hari_sin", "hari_cos", "akhir_pekan"]
features = common.add_features(segment)
daily = []
for day, part in grid.groupby(grid.index.date):
    daily.append({"day": day.isoformat(), "complete": int(part.notna().all(axis=1).sum()), "missing": int(part.isna().any(axis=1).sum())})
aggregate_start = clean.timestamp.iloc[0].floor("5min")
aggregate_raw = clean[(clean.timestamp >= aggregate_start) & (clean.timestamp < aggregate_start + pd.Timedelta(minutes=30))]

SOURCE_PATHS = {'02_prepare.py': '03_praproses/02_prepare.py', '04_train.py': '04_training/04_train.py', 'job_control.py': '04_training/job_control.py', 'pc_training_state.py': '04_training/pc_training_state.py', '03_baselines.py': '05_baseline/03_baselines.py', '05_evaluate.py': '06_evaluasi/05_evaluate.py', 'common.py': 'fungsi_bersama/common.py'}

def code_function(file, name):
    source = (ROOT / "Pipeline/pipeline_training_pc_final" / SOURCE_PATHS[file]).read_text()
    node = next(n for n in ast.parse(source).body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == name)
    return {"file": SOURCE_PATHS[file], "line": node.lineno, "text": "\n".join(source.splitlines()[node.lineno-1:node.end_lineno])}

codes = {}
for key, file, name in [
    ("prepare", "common.py", "prepare_dataset"), ("interpolate", "common.py", "_interpolate_short"),
    ("segments", "common.py", "_segments"), ("features", "common.py", "add_features"),
    ("sequence", "common.py", "_sequences"), ("model", "04_train.py", "build_model"),
    ("grid", "04_train.py", "grid"), ("fit", "04_train.py", "train_once"),
    ("select", "04_train.py", "shared_selection"), ("final", "04_train.py", "final_training"),
    ("metrics", "common.py", "metrics"), ("baseline", "03_baselines.py", "simple_predictions"),
    ("sourceFile", "common.py", "prepare_dataset")]:
    codes[key] = code_function(file, name)
validation_source = (ROOT / "Pipeline/pipeline_training_pc_final/fungsi_bersama/common.py").read_text().splitlines()
validation_start = next(i for i, line in enumerate(validation_source) if line.startswith("def prepare_dataset("))
validation_end = next(i for i, line in enumerate(validation_source[validation_start:], validation_start) if line.strip() == "frame = pd.read_csv(source)")
codes["sourceValidation"] = {"file": "fungsi_bersama/common.py", "line": validation_start + 1, "text": "\n".join(validation_source[validation_start:validation_end+1])}

snapshot = {
    "source": SOURCE.name,
    "window": "20 Agustus–30 September 2026 (WIB)", "status": "Snapshot pengolahan 42 hari; bukan hasil training",
    "total": len(grid), "complete": int((~missing).sum()), "missing": int(missing.sum()),
    "rawCount": len(window), "cleanCount": len(clean), "artifactRemoved": int(artifact.sum()),
    "invalidRemoved": int((~window.temperature.between(-10, 60)).sum()),
    "raw": rows(window.head(8), ["temperature", "humidity"]),
    "artifact": rows(window.loc[artifact], ["temperature", "humidity"]),
    "aggregateRaw": rows(aggregate_raw, ["temperature", "humidity"]),
    "aggregate": rows(grid.loc[aggregate_start:aggregate_start + pd.Timedelta(minutes=25)], ["temperature", "humidity"]),
    "scale": {"min": lo.to_dict(), "max": hi.to_dict()},
    "scaled": rows(scaled.head(8), ["temperature", "humidity", "temperature_celsius", "humidity_raw"]),
    "daily": daily, "splits": splits, "shortGap": gap_example(short) if short is not None else None, "longGap": gap_example(long),
    "features": rows(features.head(8), feature_columns), "featureColumns": feature_columns,
    "sequence": rows(features.head(210), feature_columns + ["temperature_celsius"]), "codes": codes,
}
artifact_indices = window.loc[artifact].index
first_artifact, last_artifact = window.loc[artifact, "timestamp"].min(), window.loc[artifact, "timestamp"].max()
cleaning_example = pd.concat([window[window.timestamp < first_artifact].tail(3), window.loc[artifact_indices], window[window.timestamp > last_artifact].head(3)])
example_rows = rows(cleaning_example, ["temperature", "humidity"])
for item, (_, row) in zip(example_rows, cleaning_example.iterrows()):
    item["exactTime"] = row.timestamp.strftime("%d/%m %H:%M:%S.%f")[:-3]
    item["removedAt"] = "artifact" if row.name in artifact_indices else None
    item["reason"] = "Berada dalam interval artefak" if item["removedAt"] else "Angka valid, di luar interval artefak, suhu dalam rentang, timestamp unik"
snapshot["cleaning"] = {"steps": cleaning_steps, "example": example_rows, "sampleDescription": "Tiga pembacaan sebelum artefak, enam pembacaan artefak, dan tiga pembacaan setelahnya. Potongan asli; bukan simulasi."}
export_lines = Path(__file__).read_text().splitlines()
def export_excerpt(first, last):
    left = next(i for i, line in enumerate(export_lines) if line == first)
    right = next(i for i, line in enumerate(export_lines[left:], left) if line == last)
    return {"file": "scripts/export-pipeline-snapshot.py", "line": left + 1, "text": "\n".join(export_lines[left:right+1])}
snapshot["sourceIdentity"] = {
    "rows": source_rows, "columns": source_columns, "bytes": SOURCE.stat().st_size,
    "first": frame.timestamp.min().isoformat(), "last": frame.timestamp.max().isoformat(),
    "code": [
        export_excerpt('ROOT = Path(__file__).resolve().parents[2]', 'SOURCE = ROOT / "Dataset/sensor_ruang_04agu_sampai_20261006_120840_wib.csv"'),
        export_excerpt('frame = pd.read_csv(SOURCE)', 'source_rows = len(frame)'),
        export_excerpt('frame["timestamp"] = pd.to_datetime(frame.waktu_wib, format="mixed", utc=True).dt.tz_convert("Asia/Jakarta")', 'frame["timestamp"] = pd.to_datetime(frame.waktu_wib, format="mixed", utc=True).dt.tz_convert("Asia/Jakarta")'),
        export_excerpt('start, end = pd.Timestamp("2026-08-20T00:00:00+07:00"), pd.Timestamp("2026-10-01T00:00:00+07:00")', 'window = frame[(frame.timestamp >= start) & (frame.timestamp < end)].copy()'),
    ],
}
if snapshot["shortGap"] is None:
    example = segment.head(8)[["temperature_celsius"]].rename(columns={"temperature_celsius": "temperature"})
    example.iloc[3:5, 0] = np.nan
    interpolated, _ = common._interpolate_short(example, 3)
    example_rows = rows(example, ["temperature"])
    for item, value in zip(example_rows, interpolated.temperature):
        item["after"] = round(float(value), 6)
    snapshot["shortGap"] = {"slots": 2, "simulated": True, "rows": example_rows}
destination = ROOT / "web_frontend/src/data/pipelineSnapshot.json"
destination.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
print(json.dumps({"snapshot": str(destination), "total": snapshot["total"], "complete": snapshot["complete"], "splits": splits}, indent=2))
