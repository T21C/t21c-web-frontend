import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { ChevronIcon } from "@/components/common/icons";
import { CustomSelect } from "@/components/common/selectors";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function PlayerRankHistoryModule({
  collapsed,
  onCollapsedChange,
  metricOptions,
  selectedMetricOption,
  onMetricChange,
  range,
  onRangeChange,
  chartKey,
  chartData,
  yDomain,
  getTicks,
  utcWholeDaysAgo,
  loading,
  error,
}) {
  const { t } = useTranslation("pages");
  const expanded = !collapsed;
  return (
    <section className="player-page__section player-page__rank-history">
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">
          {t("profile.sections.rankHistory.title")}
        </h2>
        <button
          type="button"
          className="account-profile-page__chevron-btn"
          aria-expanded={expanded}
          aria-label={
            collapsed
              ? t("profile.sections.rankHistory.expand")
              : t("profile.sections.rankHistory.collapse")
          }
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <ChevronIcon direction={expanded ? "down" : "right"} />
        </button>
      </div>
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => onCollapsedChange(!open)}
        revealOverflow
        duration="0.3s"
        easing="ease-in-out"
      >
        <CollapsibleContent>
          <div className="account-profile-page__collapsible">
            <div className="rank-history__controls">
              <div className="rank-history__control">
                <span className="rank-history__control-label">
                  {t("profile.sections.rankHistory.metricLabel")}
                </span>
                <CustomSelect
                  options={metricOptions}
                  value={selectedMetricOption}
                  onChange={(option) => onMetricChange(option.value)}
                  width="14rem"
                  menuPlacement="bottom"
                  isSearchable={false}
                />
              </div>
              <div className="rank-history__control">
                <span className="rank-history__control-label">
                  {t("profile.sections.rankHistory.rangeLabel")}
                </span>
                <div className="rank-history__range-buttons">
                  {[
                    { key: "30d", label: t("profile.sections.rankHistory.range30") },
                    { key: "90d", label: t("profile.sections.rankHistory.range90") },
                    { key: "365d", label: t("profile.sections.rankHistory.range365") },
                    { key: "all", label: t("profile.sections.rankHistory.rangeAll") },
                  ].map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      className={[
                        "rank-history__range-btn",
                        range === b.key ? "rank-history__range-btn--active" : "",
                      ]
                        .join(" ")
                        .trim()}
                      onClick={() => onRangeChange(b.key)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rank-history__chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  key={chartKey}
                  data={chartData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.12)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--color-gray-2)", fontSize: 11 }}
                    interval="equidistantPreserveStart"
                  />
                  <YAxis
                    dataKey="rank"
                    domain={yDomain}
                    reversed
                    allowDecimals={false}
                    width={44}
                    ticks={getTicks(yDomain[0], yDomain[1], 10)}
                    tick={{ fill: "var(--color-gray-2)", fontSize: 11 }}
                    label={{
                      value: t("profile.sections.rankHistory.yAxisRank"),
                      angle: -90,
                      position: "insideLeft",
                      fill: "var(--color-gray-2)",
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-black)",
                      border: "1px solid var(--btn-neutral-heavy)",
                      color: "var(--color-white)",
                    }}
                    labelStyle={{ color: "var(--color-gray-2)" }}
                    labelFormatter={(label) => {
                      if (typeof label !== "string") return label != null ? String(label) : "";
                      const days = utcWholeDaysAgo(label);
                      if (days === null) return label;
                      if (days < 0) return label;
                      if (days === 0) return t("profile.sections.rankHistory.tooltipToday");
                      if (days === 1) return t("profile.sections.rankHistory.tooltipOneDayAgo");
                      return t("profile.sections.rankHistory.tooltipDaysAgo", { count: days });
                    }}
                    formatter={(value) => [
                      value != null ? `#${value}` : "—",
                      t("profile.sections.rankHistory.yAxisRank"),
                    ]}
                  />
                  <Line
                    type="bump"
                    dataKey="rank"
                    stroke="var(--btn-primary)"
                    strokeWidth={4}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {loading ? (
              <div className="rank-history__status" aria-busy="true">
                {t("profile.sections.rankHistory.loading")}
              </div>
            ) : null}
            {error ? (
              <div className="rank-history__status rank-history__status--error">
                {t("profile.sections.rankHistory.error")}
              </div>
            ) : null}
            {!loading && !error && chartData.length === 0 ? (
              <div className="rank-history__status">{t("profile.sections.rankHistory.empty")}</div>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
