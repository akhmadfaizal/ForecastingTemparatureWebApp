import { useEffect, useState } from "react";
import { Database, FileCsv, CalendarBlank, Clock } from "@phosphor-icons/react";
import snapshot from "../../data/pipelineSnapshot.json";

const stages = [
  { label: "Pilih file CSV", icon: FileCsv, title: "Mulai dari file sensor asli", description: "Data sensor diekspor dari InfluxDB ke CSV. File lokal ini menjadi sumber visualisasi; halaman tidak mengambil ulang data dari InfluxDB.", result: snapshot.source },
  { label: "Baca tabel", icon: Database, title: "Ubah CSV menjadi tabel Python", description: "pandas membaca baris dan nama kolom. Suhu dan kelembapan akan dipakai oleh model; linkquality bukan fitur model pada pipeline ini.", result: `${new Intl.NumberFormat("id-ID").format(snapshot.sourceIdentity.rows)} baris dalam file sumber` },
  { label: "Samakan waktu", icon: Clock, title: "Semua timestamp memakai WIB", description: "Format waktu dibaca sebagai timestamp dan dikonversi ke Asia/Jakarta. Zona waktu yang sama menjaga batas hari dan urutan pengamatan tetap konsisten.", result: "Asia/Jakarta · UTC+07:00" },
  { label: "Ambil 42 hari", icon: CalendarBlank, title: "Pilih rentang penelitian", description: "Ambil pembacaan mulai 20 Agustus 00.00 sampai sebelum 1 Oktober 00.00 WIB. Hasilnya mencakup 20 Agustus–30 September: 42 hari kalender.", result: `${new Intl.NumberFormat("id-ID").format(snapshot.rawCount)} pembacaan dalam jendela 42 hari` },
];

export default function SourceIdentityVisual() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setTimeout(() => {
      if (step === stages.length - 1) setPlaying(false);
      else setStep(value => value + 1);
    }, 2600);
    return () => clearTimeout(timer);
  }, [playing, step]);
  const active = stages[step];
  const Icon = active.icon;
  const code = snapshot.sourceIdentity.code[step];
  const choose = value => { setPlaying(false); setStep(value); };
  return <div className="source-visual">
    <div className="source-animation-toolbar"><div><h4>Ikuti perjalanan file sensor</h4><p>Empat langkah sebelum data dibersihkan.</p></div><div><button type="button" className="cleaning-action" onClick={() => { if (playing) setPlaying(false); else { if (step === stages.length - 1) setStep(0); setPlaying(true); } }}>{playing ? "Jeda animasi" : step === stages.length - 1 ? "Putar ulang animasi" : "Putar animasi"}</button><button type="button" className="source-next" disabled={step === stages.length - 1} onClick={() => choose(step + 1)}>Langkah berikutnya →</button></div></div>
    <nav className="source-path" aria-label="Proses sumber dan identitas">{stages.map((item, i) => {
      const StepIcon = item.icon;
      return <button type="button" key={item.label} aria-current={step === i ? "step" : undefined} className={i < step ? "is-complete" : ""} onClick={() => choose(i)}><span><StepIcon size={22} />{i < step && <b aria-label="Selesai">✓</b>}</span><small>{i + 1}. {item.label}</small>{i < stages.length - 1 && <i className={playing && step === i ? "is-moving" : ""} aria-hidden="true">→</i>}</button>;
    })}</nav>
    <div className="source-active-stage" key={step} aria-live={playing ? "off" : "polite"}><div className="source-stage-symbol"><Icon size={36} weight="duotone" /></div><div><small>Langkah {step + 1} / {stages.length}</small><h4>{active.title}</h4><p>{active.description}</p><strong >{active.result}</strong></div></div>
    <p className="pipeline-note">Animasi memperlihatkan urutan proses, bukan menjalankan Python secara langsung. Kamu juga bisa memilih langkah satu per satu.</p>
    {step === 1 && <div className="source-columns">{snapshot.sourceIdentity.columns.map(column => <span key={column}>{column}</span>)}</div>}
    {step === 2 && <div className="source-time-example"><span>Contoh waktu yang dibaca</span><code>{snapshot.raw[0].time}</code><strong>20 Agustus 2026 · {snapshot.raw[0].time.slice(11, 19)} WIB</strong></div>}
    {step === 3 && <div className="source-window"><div><small>Mulai, termasuk batas</small><strong>20 Agustus · 00.00 WIB</strong></div><div className="source-window-line"><span>42 hari</span></div><div><small>Akhir, tidak termasuk batas</small><strong>1 Oktober · 00.00 WIB</strong></div></div>}
    <div className="source-python"><div><h4>Python yang dipakai pada langkah ini</h4><span>{code.file}:{code.line}</span></div><pre><code>{code.text}</code></pre><p>Cuplikan dari script yang menghasilkan snapshot data halaman ini. Library: <code>pathlib</code> dan <code>pandas</code>. Potongan mengikuti konteks script lengkap, bukan program mandiri.</p></div>
    <details className="pipeline-code"><summary>Lihat potongan data sumber dan kode pipeline training</summary><div className="pipeline-table-wrap"><table className="pipeline-table"><thead><tr><th>Waktu WIB</th><th>Suhu °C</th><th>Kelembapan %</th></tr></thead><tbody>{snapshot.raw.map((row, i) => <tr key={i}><td>{row.label}</td><td>{row.temperature}</td><td>{row.humidity}</td></tr>)}</tbody></table></div><h4>Pemeriksaan file dan kolom · fungsi_bersama/common.py</h4><pre><code>{snapshot.codes.sourceValidation.text}</code></pre><p>Dataset dibaca tanpa pemeriksaan SHA-256. Pipeline tetap memeriksa keberadaan file, kolom wajib, waktu, dan nilai sensor. Cuplikan ini berasal dari snapshot 6 Oktober 2026. Menurut catatan 11 Oktober 2026, konfigurasi aktif sudah 42 hari, praproses selesai dan tuning berjalan di PC. Cuplikan kode belum diekspor ulang; ini bukan status langsung.</p></details>
  </div>;
}
