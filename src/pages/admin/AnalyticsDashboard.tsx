import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAdmin } from './AdminLayout';
// types used via useAdmin().bookings
import '../AdminDashboard.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type AnalyticsTab = 'revenue' | 'bookings' | 'sources' | 'coupons';
type Period = 'daily' | 'weekly' | 'monthly';

const COLORS = {
  primary: '#f05e2a',
  success: '#22c55e',
  info: '#3b82f6',
  warning: '#eab308',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6',
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.info,
  COLORS.success,
  COLORS.warning,
  COLORS.purple,
  COLORS.pink,
  COLORS.teal,
  COLORS.danger,
];

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  confirmed: COLORS.info,
  completed: COLORS.success,
  cancelled: COLORS.danger,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toISOString().slice(0, 10);
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function getDayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function formatPeriodLabel(key: string, period: Period): string {
  if (period === 'monthly') {
    const d = new Date(key + '-01');
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  const d = new Date(key);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  isCurrency?: boolean;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, isCurrency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--admin-card-bg, #1e1e2e)',
        border: '1px solid var(--admin-border, #333)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
      }}
    >
      <p style={{ margin: 0, color: 'var(--admin-text-secondary, #999)', marginBottom: 4 }}>
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: 0, color: entry.color, fontWeight: 600 }}>
          {entry.name}: {isCurrency ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnalyticsDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { bookings, coupons } = useAdmin();

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('revenue');
  const [revenuePeriod, setRevenuePeriod] = useState<Period>('weekly');

  const tabs: { key: AnalyticsTab; label: string }[] = [
    { key: 'revenue', label: t('admin.analytics.tabs.revenue') },
    { key: 'bookings', label: t('admin.analytics.tabs.bookings') },
    { key: 'sources', label: t('admin.analytics.tabs.sources') },
    { key: 'coupons', label: t('admin.analytics.tabs.coupons') },
  ];

  // -----------------------------------------------------------------------
  // Revenue data
  // -----------------------------------------------------------------------

  const completedBookings = useMemo(
    () => bookings.filter((b) => b.status === 'completed'),
    [bookings]
  );

  const totalRevenue = useMemo(
    () => completedBookings.reduce((sum, b) => sum + (b.orderData?.estimatedTotal ?? 0), 0),
    [completedBookings]
  );

  const revenueChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    const keyFn =
      revenuePeriod === 'daily' ? getDayKey : revenuePeriod === 'weekly' ? getWeekKey : getMonthKey;

    completedBookings.forEach((b) => {
      const key = keyFn(b.date || b.createdAt);
      grouped[key] = (grouped[key] || 0) + (b.orderData?.estimatedTotal ?? 0);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        name: formatPeriodLabel(key, revenuePeriod),
        revenue: value,
      }));
  }, [completedBookings, revenuePeriod]);

  // -----------------------------------------------------------------------
  // Bookings by region
  // -----------------------------------------------------------------------

  const regionData = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      const region = b.region || 'Unknown';
      counts[region] = (counts[region] || 0) + 1;
    });
    const total = bookings.length || 1;
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    }));
  }, [bookings]);

  // -----------------------------------------------------------------------
  // Bookings by package
  // -----------------------------------------------------------------------

  const packageData = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      const pkg = b.orderData?.packageName || t('admin.analytics.unknown');
      counts[pkg] = (counts[pkg] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [bookings, t]);

  // -----------------------------------------------------------------------
  // Bookings by status over time (weekly)
  // -----------------------------------------------------------------------

  const statusOverTimeData = useMemo(() => {
    const weekMap: Record<string, Record<string, number>> = {};
    bookings.forEach((b) => {
      const week = getWeekKey(b.date || b.createdAt);
      if (!weekMap[week]) weekMap[week] = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
      weekMap[week][b.status] = (weekMap[week][b.status] || 0) + 1;
    });
    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, statuses]) => ({
        name: formatPeriodLabel(key, 'weekly'),
        ...statuses,
      }));
  }, [bookings]);

  // -----------------------------------------------------------------------
  // Volume trend
  // -----------------------------------------------------------------------

  const volumeTrendData = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      const key = getWeekKey(b.date || b.createdAt);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        name: formatPeriodLabel(key, 'weekly'),
        count,
      }));
  }, [bookings]);

  // -----------------------------------------------------------------------
  // Referral sources
  // -----------------------------------------------------------------------

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      const source = b.referralSource || t('admin.analytics.directOrUnknown');
      counts[source] = (counts[source] || 0) + 1;
    });
    const total = bookings.length || 1;
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }));
  }, [bookings, t]);

  // -----------------------------------------------------------------------
  // Coupon data
  // -----------------------------------------------------------------------

  const couponUsageData = useMemo(() => {
    return coupons
      .filter((c) => c.usedCount > 0)
      .sort((a, b) => b.usedCount - a.usedCount)
      .map((c) => ({
        name: c.code,
        usedCount: c.usedCount,
      }));
  }, [coupons]);

  const totalCouponDiscount = useMemo(() => {
    let total = 0;
    bookings.forEach((b) => {
      if (b.couponDiscount) {
        const val = parseFloat(b.couponDiscount);
        if (!isNaN(val)) total += val;
      }
    });
    return total;
  }, [bookings]);

  const couponBookingsCount = useMemo(
    () => bookings.filter((b) => b.couponCode).length,
    [bookings]
  );

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderRevenueTab = () => (
    <div className="analytics-section">
      <div className="analytics-controls">
        <div className="analytics-stat-large">
          <span className="analytics-stat-label">{t('admin.analytics.totalRevenue')}</span>
          <span className="analytics-stat-value">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="analytics-period-btns">
          {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              className={`btn-sm${revenuePeriod === p ? ' active' : ''}`}
              onClick={() => setRevenuePeriod(p)}
            >
              {t(`admin.analytics.period.${p}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="admin-card" style={{ padding: 16 }}>
        {revenueChartData.length === 0 ? (
          <p className="analytics-empty">{t('admin.analytics.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border, #333)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 12 }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<CustomTooltip isCurrency />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name={t('admin.analytics.tabs.revenue')}
                stroke={COLORS.primary}
                strokeWidth={2}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  const renderBookingsTab = () => (
    <div className="analytics-section">
      {/* By Region - Pie */}
      <div className="analytics-grid">
        <div className="admin-card" style={{ padding: 16 }}>
          <h3 className="analytics-chart-title">{t('admin.analytics.byRegion')}</h3>
          {regionData.length === 0 ? (
            <p className="analytics-empty">{t('admin.analytics.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={regionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`
                  }
                >
                  {regionData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Package - Bar */}
        <div className="admin-card" style={{ padding: 16 }}>
          <h3 className="analytics-chart-title">{t('admin.analytics.byPackage')}</h3>
          {packageData.length === 0 ? (
            <p className="analytics-empty">{t('admin.analytics.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={packageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border, #333)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name={t('admin.analytics.bookingCount')}
                  fill={COLORS.info}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* By Status Over Time */}
      <div className="admin-card" style={{ padding: 16, marginTop: 16 }}>
        <h3 className="analytics-chart-title">{t('admin.analytics.byStatus')}</h3>
        {statusOverTimeData.length === 0 ? (
          <p className="analytics-empty">{t('admin.analytics.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={statusOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border, #333)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip />
              <Legend />
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <Area
                  key={status}
                  type="monotone"
                  dataKey={status}
                  name={t(`admin.tabs.${status}`)}
                  stackId="1"
                  stroke={color}
                  fill={color}
                  fillOpacity={0.4}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Volume Trend */}
      <div className="admin-card" style={{ padding: 16, marginTop: 16 }}>
        <h3 className="analytics-chart-title">{t('admin.analytics.volumeTrend')}</h3>
        {volumeTrendData.length === 0 ? (
          <p className="analytics-empty">{t('admin.analytics.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={volumeTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border, #333)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                name={t('admin.analytics.bookingCount')}
                stroke={COLORS.teal}
                strokeWidth={2}
                dot={{ r: 4, fill: COLORS.teal }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  const renderSourcesTab = () => (
    <div className="analytics-section">
      <div className="admin-card" style={{ padding: 16 }}>
        <h3 className="analytics-chart-title">{t('admin.analytics.referralSources')}</h3>
        {sourceData.length === 0 ? (
          <p className="analytics-empty">{t('admin.analytics.noData')}</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(200, sourceData.length * 50)}>
              <BarChart data={sourceData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border, #333)" />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 12 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 12 }}
                  width={120}
                />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name={t('admin.analytics.bookingCount')}
                  fill={COLORS.purple}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="analytics-source-list">
              {sourceData.map((s, i) => (
                <div key={i} className="analytics-source-item">
                  <span className="analytics-source-name">{s.name}</span>
                  <span className="analytics-source-stats">
                    {s.count} ({s.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderCouponsTab = () => (
    <div className="analytics-section">
      <div className="analytics-grid">
        <div className="admin-card" style={{ padding: 16 }}>
          <h3 className="analytics-chart-title">{t('admin.analytics.usageByCoupon')}</h3>
          {couponUsageData.length === 0 ? (
            <p className="analytics-empty">{t('admin.analytics.noCouponData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={couponUsageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border, #333)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: 'var(--admin-text-secondary, #999)', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip />
                <Bar
                  dataKey="usedCount"
                  name={t('admin.analytics.timesUsed')}
                  fill={COLORS.pink}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="admin-card" style={{ padding: 16 }}>
          <h3 className="analytics-chart-title">{t('admin.analytics.revenueImpact')}</h3>
          <div className="analytics-coupon-stats">
            <div className="analytics-stat-block">
              <span className="analytics-stat-label">
                {t('admin.analytics.totalDiscountGiven')}
              </span>
              <span className="analytics-stat-value" style={{ color: COLORS.danger }}>
                {formatCurrency(totalCouponDiscount)}
              </span>
            </div>
            <div className="analytics-stat-block">
              <span className="analytics-stat-label">
                {t('admin.analytics.bookingsWithCoupons')}
              </span>
              <span className="analytics-stat-value" style={{ color: COLORS.info }}>
                {couponBookingsCount}
              </span>
            </div>
            <div className="analytics-stat-block">
              <span className="analytics-stat-label">{t('admin.analytics.activeCoupons')}</span>
              <span className="analytics-stat-value" style={{ color: COLORS.success }}>
                {coupons.filter((c) => c.enabled).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className="analytics-dashboard">
      {/* Tab bar */}
      <div className="analytics-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`analytics-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'revenue' && renderRevenueTab()}
      {activeTab === 'bookings' && renderBookingsTab()}
      {activeTab === 'sources' && renderSourcesTab()}
      {activeTab === 'coupons' && renderCouponsTab()}
    </div>
  );
};

export default AnalyticsDashboard;
