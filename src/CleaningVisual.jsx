import { useState } from "react";
import snapshot from "./pipelineSnapshot.json";

const format = value => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);

export default function CleaningVisual() {
  const [cleaned, setCleaned] = useState(false);
  const [selected, setSelected] = useState(null);
  const { steps, example } = snapshot.cleaning;
  const kept = example.filter(row => !row.removedAt);
  const rejected = example.filter(row => row.removedAt);
  const record = example.find(row => row.time === selected);
  const showRecord = (row, status) => <button type="button" key={row.time} className={`cleaning-record ${status === "removed" ? "is-removed" : status === "kept" ? "is-kept" : "is-unchecked"}`} aria-pressed={selected === row.time} onClick={() => setSelected(row.time)}><small>{row.exactTime.slice(6, 14)} WIB</small><strong>{format(row.temperature)} <span>°C</span></strong><em>{status === "removed" ? "× Tidak dipakai" : status === "kept" ? "✓ Dipakai" : "Data masuk"}</em></button>;
  return <div className="cleaning-visual">
    <div className="cleaning-simple-intro"><h4>Pembersihan berarti memilih data yang boleh dipakai.</h4><p>Pada data ini, <strong>6 pembacaan</strong> masuk ke periode yang sudah ditandai sebagai artefak. Pembacaan tersebut dikeluarkan; pembacaan lainnya tetap dipakai.</p></div>
    <ol className="cleaning-simple-path"><li><span>1</span><div><strong>Data masuk</strong><small>Sensor mencatat suhu.</small></div></li><li><span>2</span><div><strong>Data diperiksa</strong><small>Cek nilai, waktu dan aturan.</small></div></li><li className={cleaned ? "is-done" : ""}><span>3</span><div><strong>Data bersih</strong><small>Hanya pembacaan yang lolos.</small></div></li></ol>
    <div className="cleaning-demo-toolbar"><div><strong>Contoh: 12 pembacaan asli</strong><p>Diambil dari 26 Agustus 2026, sebelum, selama dan setelah periode artefak.</p></div><button type="button" className="cleaning-action" onClick={() => { setCleaned(value => !value); setSelected(null); }}>{cleaned ? "Ulangi dari awal" : "Lihat hasil pembersihan →"}</button></div>
    {!cleaned ? <div className="cleaning-example-input"><h4>Belum dibersihkan · 12 pembacaan</h4><div className="cleaning-records">{example.map(row => showRecord(row, "input"))}</div><p className="pipeline-note">Tekan “Lihat hasil pembersihan” untuk melihat pembacaan dipisahkan.</p></div> : <div className="cleaning-results" aria-live="polite"><div className="cleaning-result-kept"><h4>✓ Data bersih · {kept.length} pembacaan</h4><p>Pembacaan ini lolos pemeriksaan dan dipakai pada tahap berikutnya.</p><div className="cleaning-records">{kept.map(row => showRecord(row, "kept"))}</div></div><div className="cleaning-result-removed"><h4>× Dikeluarkan · {rejected.length} pembacaan</h4><p>Waktunya berada dalam periode artefak yang sudah ditetapkan. Nilainya tidak ikut dihitung.</p><div className="cleaning-records">{rejected.map(row => showRecord(row, "removed"))}</div></div></div>}
    <p className="pipeline-note">Klik salah satu pembacaan untuk melihat waktu lengkap dan penjelasannya.</p>
    {record && <div className={`cleaning-record-detail ${cleaned && record.removedAt ? "rejected" : "kept"}`} aria-live="polite"><strong>{record.exactTime} WIB · {format(record.temperature)} °C</strong><p>{!cleaned ? "Pembacaan asli sebelum pembersihan. Tekan tombol hasil untuk melihat apakah pembacaan ini dipakai." : record.removedAt ? "Tidak dipakai karena waktunya masuk periode artefak. Suhu yang terlihat wajar pun dapat dikeluarkan jika termasuk periode tersebut." : "Dipakai karena pembacaan memenuhi aturan pembersihan dan berada di luar periode artefak."}</p></div>}
    <div className="cleaning-total-summary"><span>Untuk seluruh dataset 42 hari</span><strong>{format(snapshot.rawCount)} masuk − {snapshot.artifactRemoved} dikeluarkan = {format(snapshot.cleanCount)} pembacaan bersih</strong><p>Contoh di atas hanya potongan data. Angka ini menghitung seluruh pembacaan sebelum agregasi lima menit.</p></div>
    <details className="pipeline-code"><summary>Lihat aturan pembersihan lengkap</summary>{steps.map((item, i) => <div className="cleaning-rule" key={item.id}><strong>{i + 1}. {item.name}</strong><p>{item.rule}</p><p>{format(item.before - item.after)} pembacaan dikeluarkan pada langkah ini.</p></div>)}<p>Periode artefak memakai batas eksklusif: pembacaan tepat pada awal dan akhir batas tetap dipertahankan. Timestamp diperiksa sampai milidetik; dua pembacaan pada menit yang sama belum berarti duplikat.</p><p>Ini visualisasi pengolahan data asli. Tombol hanya mengubah tampilan dan tidak mengubah file CSV.</p></details>
  </div>;
}
