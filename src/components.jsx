import { useCallback } from "react";
import { Button } from "@fluentui/react-components";
import { Database, Thermometer } from "@phosphor-icons/react";
import { formatDateTime, formatTime } from "./utils";

export function PredictionRow({ item }) {
  const displayIdentity = JSON.stringify([item.id, item.generatedAt, item.temperature, item.targetAt]);
  const recordDisplay = useCallback(node => {
    if (!node) return;
    // DOM-commit time does not imply remote delivery or human reading.
    node.dataset.renderedIdentity = displayIdentity;
    node.dataset.renderedAt = new Date().toISOString();
  }, [displayIdentity]);
  return (
    <div ref={recordDisplay} className="prediction-row" data-prediction-id={item.id} data-generated-at={item.generatedAt} data-model={item.model} data-horizon={item.horizon}>
      <div className="horizon"><span>H+{item.horizon}</span><small>menit</small></div>
      <div className="prediction-value"><strong>{Number.isFinite(item.temperature) ? item.temperature.toFixed(2) : "-"} °C</strong><span>{item.model}</span></div>
      <div className={`prediction-status ${item.above ? "is-warning" : "is-normal"}`}>{item.above ? "Di atas ambang" : "Dalam batas"}</div>
      <time title={formatDateTime(item.targetAt)}>{formatTime(item.targetAt)}</time>
    </div>
  );
}

export function ReadingsTable({ readings, loading, threshold }) {
  if (loading) return <LoadingBlock />;
  if (!readings.length) return <EmptyInline text="Belum ada pembacaan sensor." />;
  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Waktu WIB</th><th>Suhu</th><th>Kelembapan</th><th>Perbandingan ambang</th></tr></thead>
        <tbody>{readings.map((row, index) => {
          const temperature = Number(row.temperature);
          const above = temperature >= threshold;
          return (
            <tr key={`${row.timestamp}-${index}`}>
              <td>{formatDateTime(row.timestamp)}</td>
              <td className="numeric">{temperature.toFixed(2)} °C</td>
              <td className="numeric">{row.humidity == null ? "-" : `${Number(row.humidity).toFixed(1)}%`}</td>
              <td><span className={above ? "text-warning" : "text-normal"}>{above ? `≥ ${threshold} °C` : `< ${threshold} °C`}</span></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

export function TemperatureTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><span>{formatTime(label)} WIB</span><strong>{Number(payload[0].value).toFixed(2)} °C</strong></div>;
}

export function LoadingBlock({ tall = false }) {
  return <div className={`skeleton-group ${tall ? "tall" : ""}`} aria-label="Memuat data"><span /><span /><span /></div>;
}

export function EmptyInline({ text }) {
  return <div className="empty-inline"><Database size={28} weight="duotone" /><p>{text}</p></div>;
}

export function EmptyTemperature({ onDemo }) {
  return (
    <div className="empty-temperature">
      <Thermometer size={40} weight="duotone" />
      <h2>Belum ada data sensor</h2>
      <p>Belum ada snapshot yang dapat ditampilkan dari backend.</p>
      <Button appearance="secondary" onClick={onDemo}>Lihat data simulasi</Button>
    </div>
  );
}
