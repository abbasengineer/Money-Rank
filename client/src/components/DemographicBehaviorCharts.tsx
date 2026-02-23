import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

const AGE_GROUP_ORDER = ['<25', '25-34', '35-44', '45-54', '55-64', '65+', 'unknown'];
const AGE_GROUP_COLORS: Record<string, string> = {
  '<25': '#3b82f6',
  '25-34': '#8b5cf6',
  '35-44': '#ec4899',
  '45-54': '#f59e0b',
  '55-64': '#10b981',
  '65+': '#6366f1',
  unknown: '#94a3b8',
};

export interface CategoryAnalyticsCategory {
  category: string;
  avgScore: number;
  totalAttempts: number;
  riskChoiceRate: number;
  demographicBreakdown: Record<string, {
    ageGroups?: Record<string, { avgScore: number; riskRate: number; count: number; avgAge: number | null }>;
    avgScore?: number;
    riskRate?: number;
    count?: number;
  }>;
}

export interface CategoryAnalyticsResponse {
  categories: CategoryAnalyticsCategory[];
}

function flattenDemographics(data: CategoryAnalyticsResponse | null): Array<{
  category: string;
  incomeBracket: string;
  ageGroup: string;
  avgScore: number;
  riskRate: number;
  count: number;
}> {
  if (!data?.categories) return [];
  const out: Array<{ category: string; incomeBracket: string; ageGroup: string; avgScore: number; riskRate: number; count: number }> = [];
  for (const cat of data.categories) {
    for (const [income, incData] of Object.entries(cat.demographicBreakdown || {})) {
      if (incData.ageGroups) {
        for (const [ageGroup, ageData] of Object.entries(incData.ageGroups)) {
          out.push({
            category: cat.category,
            incomeBracket: income,
            ageGroup,
            avgScore: ageData.avgScore,
            riskRate: ageData.riskRate,
            count: ageData.count,
          });
        }
      } else if (incData.avgScore != null && incData.riskRate != null && incData.count != null) {
        out.push({
          category: cat.category,
          incomeBracket: income,
          ageGroup: 'unknown',
          avgScore: incData.avgScore,
          riskRate: incData.riskRate,
          count: incData.count,
        });
      }
    }
  }
  return out;
}

function heatmapMatrix(data: CategoryAnalyticsResponse | null): {
  rows: string[];
  columns: string[];
  getValue: (row: string, col: string) => number | null;
} {
  const flat = flattenDemographics(data);
  const columns = [...new Set(flat.map((c) => c.category))].sort();
  const rows = AGE_GROUP_ORDER.filter((ag) => flat.some((c) => c.ageGroup === ag));
  if (rows.length === 0) rows.push('unknown');

  const weighted: Record<string, { sum: number; total: number }> = {};
  for (const c of flat) {
    const key = `${c.ageGroup}|${c.category}`;
    if (!weighted[key]) weighted[key] = { sum: 0, total: 0 };
    weighted[key].sum += c.riskRate * c.count;
    weighted[key].total += c.count;
  }

  return {
    rows,
    columns,
    getValue(row: string, col: string) {
      const w = weighted[`${row}|${col}`];
      if (!w || w.total === 0) return null;
      return Math.round((w.sum / w.total) * 100) / 100;
    },
  };
}

function groupedBarData(data: CategoryAnalyticsResponse | null): Array<Record<string, string | number>> {
  const flat = flattenDemographics(data);
  const categories = [...new Set(flat.map((c) => c.category))].sort();
  const ageGroups = AGE_GROUP_ORDER.filter((ag) => flat.some((c) => c.ageGroup === ag));
  if (ageGroups.length === 0) ageGroups.push('unknown');

  const weighted: Record<string, { sum: number; total: number }> = {};
  for (const c of flat) {
    const key = `${c.category}|${c.ageGroup}`;
    if (!weighted[key]) weighted[key] = { sum: 0, total: 0 };
    weighted[key].sum += c.riskRate * c.count;
    weighted[key].total += c.count;
  }

  return categories.map((category) => {
    const row: Record<string, string | number> = { category };
    for (const ag of ageGroups) {
      const w = weighted[`${category}|${ag}`];
      row[ag] = w && w.total > 0 ? Math.round((w.sum / w.total) * 100) : 0;
    }
    return row;
  });
}

function radarChartData(data: CategoryAnalyticsResponse | null): Array<Record<string, string | number>> {
  const flat = flattenDemographics(data);
  const categories = [...new Set(flat.map((c) => c.category))].sort();
  const ageGroups = AGE_GROUP_ORDER.filter((ag) => flat.some((c) => c.ageGroup === ag));
  if (ageGroups.length === 0) ageGroups.push('unknown');

  const weighted: Record<string, { sum: number; total: number }> = {};
  for (const c of flat) {
    const key = `${c.category}|${c.ageGroup}`;
    if (!weighted[key]) weighted[key] = { sum: 0, total: 0 };
    weighted[key].sum += c.avgScore * c.count;
    weighted[key].total += c.count;
  }

  return categories.map((category) => {
    const row: Record<string, string | number> = { subject: category, fullMark: 100 };
    for (const ag of ageGroups) {
      const w = weighted[`${category}|${ag}`];
      row[ag] = w && w.total > 0 ? Math.round(w.sum / w.total) : 0;
    }
    return row;
  });
}

function heatmapColor(riskRate: number): string {
  if (riskRate <= 0.15) return 'bg-emerald-500';
  if (riskRate <= 0.25) return 'bg-emerald-300';
  if (riskRate <= 0.35) return 'bg-amber-300';
  if (riskRate <= 0.5) return 'bg-orange-400';
  return 'bg-rose-500';
}

export function BehavioralHeatmap({ data }: { data: CategoryAnalyticsResponse | null }) {
  const { rows, columns, getValue } = useMemo(() => heatmapMatrix(data), [data]);
  if (!data?.categories?.length || rows.length === 0 || columns.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500 text-sm">
        No demographic data yet. Risk rate by age group × category will appear here once users with profile data complete challenges.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-800 mb-2">Heatmap: Risk rate by age group and category</h3>
      <p className="text-xs text-slate-500 mb-3">Cell = weighted average risk rate (green = lower risk, red = higher risk).</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 border border-slate-200 bg-slate-50 font-medium text-slate-700">Age</th>
              {columns.map((col) => (
                <th key={col} className="p-2 border border-slate-200 bg-slate-50 font-medium text-slate-700 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td className="p-2 border border-slate-200 font-medium text-slate-700">{row}</td>
                {columns.map((col) => {
                  const v = getValue(row, col);
                  const display = v != null ? `${(v * 100).toFixed(0)}%` : '—';
                  return (
                    <td
                      key={col}
                      className={`p-2 border border-slate-200 text-center ${v != null ? heatmapColor(v) : 'bg-slate-100'} text-slate-900`}
                      title={`${row} × ${col}: ${display}`}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BehavioralGroupedBarChart({ data }: { data: CategoryAnalyticsResponse | null }) {
  const chartData = useMemo(() => groupedBarData(data), [data]);
  const ageGroups = useMemo(() => {
    if (!data?.categories) return [];
    const flat = flattenDemographics(data);
    return AGE_GROUP_ORDER.filter((ag) => flat.some((c) => c.ageGroup === ag));
  }, [data]);

  if (!data?.categories?.length || chartData.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500 text-sm">
        No demographic data yet. Grouped bars (risk % by category and age group) will appear here once users with profile data complete challenges.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-800 mb-2">Grouped bar: Risk rate (%) by category and age group</h3>
      <p className="text-xs text-slate-500 mb-3">Compare how risk rate varies by age within each category.</p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'Risk %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
            <Tooltip formatter={(value: number) => [`${value}%`, 'Risk rate']} labelFormatter={(label) => `Category: ${label}`} />
            <Legend />
            {ageGroups.map((ag) => (
              <Bar key={ag} dataKey={ag} name={ag} fill={AGE_GROUP_COLORS[ag] ?? '#64748b'} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BehavioralRadarChart({ data }: { data: CategoryAnalyticsResponse | null }) {
  const chartData = useMemo(() => radarChartData(data), [data]);
  const ageGroups = useMemo(() => {
    if (!data?.categories) return [];
    const flat = flattenDemographics(data);
    return AGE_GROUP_ORDER.filter((ag) => flat.some((c) => c.ageGroup === ag));
  }, [data]);

  if (!data?.categories?.length || chartData.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500 text-sm">
        No demographic data yet. Radar (average score by category and age group) will appear here once users with profile data complete challenges.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-800 mb-2">Radar: Average score by category and age group</h3>
      <p className="text-xs text-slate-500 mb-3">Each axis = category; each shape = one age group. Higher = better average score.</p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
            {ageGroups.map((ag) => (
              <Radar key={ag} name={ag} dataKey={ag} stroke={AGE_GROUP_COLORS[ag] ?? '#64748b'} fill={AGE_GROUP_COLORS[ag] ?? '#64748b'} fillOpacity={0.2} strokeWidth={2} />
            ))}
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DemographicBehaviorCharts({ data }: { data: CategoryAnalyticsResponse | null }) {
  return (
    <div className="space-y-8">
      <BehavioralHeatmap data={data} />
      <BehavioralGroupedBarChart data={data} />
      <BehavioralRadarChart data={data} />
    </div>
  );
}
