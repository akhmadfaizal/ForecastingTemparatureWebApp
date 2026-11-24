import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TemperatureTooltip } from "../ui";
import { formatTime, THRESHOLD } from "../../utils/utils";

export default function TemperatureChart({ data, threshold = THRESHOLD }) {
  return (
    <div className="chart-wrap" aria-label="Grafik suhu 24 jam">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 6, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16856a" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#16856a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="x" tickFormatter={formatTime} tickLine={false} axisLine={false} minTickGap={52} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
          <YAxis domain={["dataMin - 0.5", "dataMax + 0.5"]} tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
          <Tooltip content={<TemperatureTooltip />} />
          <ReferenceLine y={threshold} stroke="#a14343" strokeDasharray="5 5" label={{ value: `${threshold} °C`, fill: "var(--text-muted)", fontSize: 11 }} />
          <Area isAnimationActive={false} type="monotone" dataKey="temperature" stroke="#16856a" strokeWidth={2.5} fill="url(#temperatureFill)" activeDot={{ r: 4, fill: "#16856a", strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
