import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Button, Card, FluentProvider, MessageBar, MessageBarBody, Switch, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import { ArrowClockwise, ChartLineUp, CheckCircle, Clock, Cube, Database, Drop, Moon, Sun, Thermometer, Warning } from "@phosphor-icons/react";
import { PREDICTION_INTERVAL_MS, useDashboardData } from "../../hooks/useDashboardData";
import { EmptyInline, EmptyTemperature, LoadingBlock, PredictionRow, ReadingsTable } from "../../components/ui";
import { ageInMinutes, formatDateTime, THRESHOLD, toChartPoint } from "../../utils/utils";

const TemperatureChart = lazy(() => import("../../components/charts/TemperatureChart"));
const PipelineModel = lazy(() => import("../Pipeline/PipelineModel"));
const STALE_AFTER_MINUTES = 10;
const IS_A1 = import.meta.env.VITE_ARCHITECTURE === "a1";

export default function App() {
  const [section, setSection] = useState(() => location.hash || "#ringkasan");
  useEffect(() => {
    const navigate = () => {
      const target = location.hash || "#ringkasan";
      setSection(target);
      document.getElementById(target.slice(1))?.scrollIntoView();
    };
    const frame = requestAnimationFrame(() => {
      if (location.hash) navigate();
    });
    window.addEventListener("hashchange", navigate);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", navigate); };
  }, []);
  useEffect(() => {
    let frame;
    const update = () => {
      const sections = ["ringkasan", "prediksi", "data", "visual-3d", "pipeline"];
      let current = sections[0];
      for (const id of sections) {
        if (document.getElementById(id)?.getBoundingClientRect().top <= 160) current = id;
      }
      setSection(`#${current}`);
      frame = undefined;
    };
    const onScroll = () => { if (frame === undefined) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);
  const [dark, setDark] = useState(() => new URLSearchParams(location.search).get("theme") === "dark" || localStorage.getItem("theme") === "dark");
  const [demo, setDemo] = useState(() => new URLSearchParams(location.search).get("demo") === "1");
  const { readings, predictions, serverTime, connected, loading, refreshing, error, reload } = useDashboardData(demo);

  useEffect(() => {
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const chartData = useMemo(() => readings.map(toChartPoint), [readings]);

  const latest = readings.at(-1);
  const currentTemperature = latest ? Number(latest.temperature) : null;
  const currentHumidity = latest?.humidity == null ? null : Number(latest.humidity);
  const threshold = predictions.find(item => Number.isFinite(item.threshold))?.threshold ?? THRESHOLD;
  const aboveThreshold = currentTemperature != null && currentTemperature >= threshold;
  const dataAge = latest ? ageInMinutes(latest.timestamp, serverTime) : null;
  const stale = dataAge != null && dataAge > STALE_AFTER_MINUTES;

  return (
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme}>
      <div className="app-shell" data-theme={dark ? "dark" : "light"}>
        <Sidebar connected={connected} dark={dark} setDark={setDark} section={section} />
        <main className="main-content">
          <div className="dashboard-content">
          <Header dark={dark} setDark={setDark} busy={loading || refreshing} reload={reload} />


          {import.meta.env.VITE_MEASUREMENT_MODE === "true" && <MessageBar intent="info" className="page-message"><MessageBarBody>Pengujian pembaruan web · Data historis pada tabel pengukuran · Model train-only</MessageBarBody></MessageBar>}
          {demo && <MessageBar intent="warning" className="page-message"><MessageBarBody>Data simulasi aktif untuk memeriksa tampilan. Data ini tidak berasal dari sistem penelitian.</MessageBarBody></MessageBar>}
          {IS_A1 && !demo && <MessageBar intent="info" className="page-message"><MessageBarBody>Arsitektur 1 · Inferensi CPU Mac · Model 42 hari</MessageBarBody></MessageBar>}
          {error && <MessageBar intent="error" className="page-message"><MessageBarBody>Tidak dapat memuat data: {error}</MessageBarBody></MessageBar>}
          {stale && !demo && <MessageBar intent="warning" className="page-message"><MessageBarBody>Data belum diperbarui. Pembacaan terakhir berusia {dataAge} menit.</MessageBarBody></MessageBar>}

          <DataSourceStatus connected={connected} demo={demo} loading={loading} latest={latest} predictions={predictions} refreshing={refreshing} />
          <Overview loading={loading} latest={latest} readings={readings} currentTemperature={currentTemperature} currentHumidity={currentHumidity} aboveThreshold={aboveThreshold} threshold={threshold} stale={stale} dataAge={dataAge} onDemo={() => setDemo(value => !value)} />

          <section id="prediksi" className="dashboard-section" aria-labelledby="history-prediction-title">
            <h2 id="history-prediction-title" className="dashboard-section-title">Riwayat &amp; prediksi</h2>
            <div className="data-layout">
            <Card className="chart-panel">
              <div className="section-heading"><div><h2>Riwayat suhu</h2><p>Maksimal 24 jam terakhir, agregasi lima menit.</p></div></div>
              {loading ? <LoadingBlock tall /> : chartData.length === 0 ? <EmptyInline text="Belum ada data untuk ditampilkan." /> : <Suspense fallback={<LoadingBlock tall />}><TemperatureChart data={chartData} threshold={threshold} /></Suspense>}
            </Card>

            <Card className="prediction-panel">
              <div className="section-heading prediction-heading"><div><h2>Prediksi terbaru</h2><p>LSTM dan GRU pada tiga horizon.</p></div></div>
              {loading ? <LoadingBlock /> : predictions.length === 0 ? <EmptyInline text="Belum ada prediksi tersimpan." /> : <div className="prediction-list">{predictions.map(item => <PredictionRow key={`${item.model}-${item.horizon}`} item={item} />)}</div>}
            </Card>
            </div>
          </section>

          <Card id="data" className="table-panel">
            <div className="section-heading"><div><h2>Data sensor</h2><p>{demo ? "Pembacaan simulasi untuk pratinjau." : IS_A1 ? "Data InfluxDB melalui Node.js, tersimpan pada MySQL Mac." : "Snapshot yang diterima dari Node-RED dan tersimpan pada Aiven."}</p></div><Button appearance="subtle" onClick={() => setDemo(value => !value)}>{demo ? "Gunakan data sistem" : "Lihat data simulasi"}</Button></div>
            <ReadingsTable readings={readings.slice(-8).reverse()} loading={loading} threshold={threshold} />
          </Card>
          <ServerRoomView />
          <Suspense fallback={<section id="pipeline"><LoadingBlock tall /></section>}><PipelineModel /></Suspense>
          </div>
        </main>
      </div>
    </FluentProvider>
  );
}

function DataSourceStatus({ connected, demo, loading, latest, predictions, refreshing }) {
  const waiting = loading && !connected;
  const title = demo ? "Data simulasi aktif" : waiting ? "Memeriksa backend" : connected ? (IS_A1 ? "Arsitektur 1 · Node.js dan MySQL Mac terhubung" : "Backend Vercel dan Aiven terhubung") : "Backend tidak terhubung";
  const stateClass = connected ? "source-online" : waiting ? "source-waiting" : "source-offline";
  return (
    <section className={`source-status ${stateClass}`} aria-label="Status sumber data" aria-live="polite">
      {connected ? <CheckCircle size={22} weight="fill" /> : <Warning size={22} weight="fill" />}
      <div className="source-copy"><strong>{title}</strong>{demo && <span>Tidak menggunakan data penelitian.</span>}</div>
      {connected && <div className="source-meta"><span>Data terakhir <strong>{formatDateTime(latest?.timestamp)}</strong></span><span>Prediksi <strong>{predictions.length} keluaran</strong></span><span>Pembaruan prediksi <strong>{demo ? "simulasi" : refreshing ? "berlangsung" : `${PREDICTION_INTERVAL_MS / 1000} detik`}</strong></span></div>}
    </section>
  );
}

function Sidebar({ connected, dark, setDark, section }) {
  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Thermometer size={24} weight="duotone" /></div><div><strong>Monitor Suhu</strong><span>Ruang server</span></div></div>
      <nav aria-label="Navigasi utama">{[
        ["#ringkasan", "Ringkasan", <ChartLineUp size={20} />], ["#prediksi", "Riwayat & prediksi", <Clock size={20} />],
        ["#data", "Data sensor", <Database size={20} />], ["#visual-3d", "Visual 3D", <Cube size={20} />], ["#pipeline", "Pipeline Model", <ChartLineUp size={20} />]
      ].map(([href, label, icon]) => <a key={href} className={`nav-item ${section === href ? "active" : ""}`} aria-current={section === href ? "page" : undefined} href={href}>{icon}{label}</a>)}</nav>
      <div className="sidebar-footer"><div className={`connection ${connected ? "online" : "offline"}`}>{connected ? <CheckCircle size={18} weight="fill" /> : <Warning size={18} weight="fill" />}<span>{connected ? "Backend terhubung" : "Koneksi terputus"}</span></div><Switch checked={dark} onChange={(_, data) => setDark(data.checked)} label={dark ? "Mode gelap" : "Mode terang"} /></div>
    </aside>
  );
}

function Header({ dark, setDark, busy, reload }) {
  return <header className="topbar"><div><p className="context-label">Monitoring dan prediksi</p><h1>Suhu ruang server</h1></div><div className="header-actions"><Button appearance="subtle" icon={dark ? <Sun /> : <Moon />} onClick={() => setDark(value => !value)} aria-label="Ganti tema" /><Button appearance="secondary" icon={<ArrowClockwise />} onClick={reload} disabled={busy}>Muat ulang</Button></div></header>;
}

function Overview({ loading, latest, readings, currentTemperature, currentHumidity, aboveThreshold, threshold, stale, dataAge, onDemo }) {
  return (
    <section id="ringkasan" className="dashboard-section" aria-labelledby="overview-title">
      <h2 id="overview-title" className="dashboard-section-title">Ringkasan</h2>
      <div className="overview-grid">
      <Card className={`temperature-panel ${aboveThreshold ? "warning-state" : "normal-state"}`}>
        {loading ? <LoadingBlock /> : currentTemperature == null ? <EmptyTemperature onDemo={onDemo} /> : <><div className="panel-heading"><span>Suhu terbaru</span><span className="status-label">{stale ? "Data lama" : aboveThreshold ? `≥ ${threshold} °C` : `< ${threshold} °C`}</span></div><div className="temperature-reading"><span>{currentTemperature.toFixed(1)}</span><small>°C</small></div><p className="updated-at">Diukur {formatDateTime(latest.timestamp)}{dataAge == null ? "" : ` · ${dataAge} menit lalu`}</p><div className="threshold-line"><span>Ambang evaluasi</span><strong>{threshold.toFixed(1)} °C</strong></div></>}
      </Card>
      <div className="system-summary"><SummaryItem icon={<Drop size={22} weight="duotone" />} label="Kelembapan" value={currentHumidity == null ? "-" : `${currentHumidity.toFixed(1)}%`} /><SummaryItem icon={<Database size={22} weight="duotone" />} label="Data ditampilkan" value={`${readings.length} slot`} /><SummaryItem icon={<Clock size={22} weight="duotone" />} label="Jendela model" value="12 jam" /></div>
      </div>
    </section>
  );
}

function SummaryItem({ icon, label, value }) {
  return <div className="summary-item"><div className="summary-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function ServerRoomView() {
  return (
    <section id="visual-3d" className="visual-page dashboard-section" aria-labelledby="visual-title">
      <h2 id="visual-title" className="dashboard-section-title">Visual 3D</h2>
      <div className="visual-intro"><p>Putar model, klik perangkat untuk melihat detail, atau klik pintu untuk membuka dan menutup.</p><a className="visual-fullscreen" href="/visual-3d/index.html" target="_blank" rel="noreferrer">Buka tampilan penuh ↗</a></div>
      <iframe loading="lazy" className="room-viewer" src="/visual-3d/index.html" title="Model 3D interaktif ruang server Kayreach" allowFullScreen />
      <p className="visual-caption">Geometri mengikuti file Blender unggahan 12 Oktober 2026; ukuran model yang berbeda dari catatan lapangan diberi keterangan dalam penampil. Status layanan Mini PC mengikuti pemeriksaan 4 Oktober 2026 pukul 17:22:09 WIB, bukan pemantauan langsung.</p>
    </section>
  );
}
