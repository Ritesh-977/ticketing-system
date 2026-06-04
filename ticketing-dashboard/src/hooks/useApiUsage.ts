import { useState, useEffect, useMemo } from 'react';
import api from '../lib/axios';

/**
 * Shape of a single daily usage record returned by the API.
 */
export interface UsagePeriod {
  usage_date: string;       // e.g. "2026-06-03"
  total_requests: number;
  live?: boolean;           // true only for today's un-flushed data
}

/**
 * Shape of a Recharts-ready data point from the API.
 */
export interface ChartDataPoint {
  date: string;       // e.g. "Jun 03"
  requests: number;
}

/**
 * Full response shape from GET /api/billing/usage.
 */
interface UsageResponse {
  tenant_id: string;
  usage: UsagePeriod[];
  chart_data: ChartDataPoint[];
}

/**
 * Hook: useApiUsage
 *
 * Fetches the 7-day daily usage data from the billing endpoint.
 * Exposes:
 *   - usage:          Raw daily usage data for tables / gauges
 *   - chartData:      Recharts-ready array for BarChart
 *   - totalRequests:  Sum of all requests in the 7-day window (for metric cards)
 *   - loading / error
 *
 * Usage:
 *   const { usage, chartData, totalRequests, loading, error } = useApiUsage();
 */
export function useApiUsage() {
  const [usage, setUsage] = useState<UsagePeriod[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsage() {
      try {
        setLoading(true);
        setError(null);

        const { data } = await api.get<UsageResponse>('/billing/usage');

        if (!cancelled) {
          setUsage(data.usage);
          setChartData(data.chart_data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.error ?? 'Failed to fetch usage data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUsage();

    return () => {
      cancelled = true;
    };
  }, []);

  // Compute total requests across the 7-day window
  const totalRequests = useMemo(
    () => usage.reduce((sum, u) => sum + u.total_requests, 0),
    [usage]
  );

  return { usage, chartData, totalRequests, loading, error };
}
