import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import axios from "axios";

import { MetaTags } from "@/components/common/display";
import api from "@/utils/api";
import { useDebouncedRequest } from "@/hooks/useDebouncedRequest";
import "./auditlogpage.css";
import "@/pages/common/sort.css";
import { AuditLogCard } from "@/components/cards";
import { CustomSelect } from "@/components/common/selectors";
import { SortAscIcon, SortDescIcon } from "@/components/common/icons";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const AUDIT_LOG_SORT_OPTIONS = [
  { value: "createdAt", label: "Created at" },
  { value: "updatedAt", label: "Updated at" },
  { value: "id", label: "ID" },
  { value: "userId", label: "User ID" },
  { value: "action", label: "Action" },
  { value: "route", label: "Route" },
  { value: "method", label: "Method" },
];

const initialQuickFilters = {
  userId: "",
  action: "",
  method: "",
  route: "",
  startDate: "",
  endDate: "",
  sort: "createdAt",
  order: "DESC",
};

const Pagination = ({
  page,
  total,
  pageSize,
  setPage,
  setPageSize,
  pageSizeOptions,
  navLocked,
}) => {
  return (
    <div className="auditlog-pagination">
      <span>
        Page {page} of {Math.ceil(total / pageSize) || 1}
      </span>
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1 || navLocked}
      >
        Prev
      </button>
      <button
        onClick={() => setPage((p) => (p * pageSize < total ? p + 1 : p))}
        disabled={page * pageSize >= total || navLocked}
      >
        Next
      </button>
      <CustomSelect
        options={pageSizeOptions}
        value={pageSizeOptions.find((opt) => opt.value === pageSize.toString())}
        onChange={(selected) => {
          setPageSize(Number(selected.value));
          setPage(1);
        }}
        width="150px"
        isDisabled={navLocked}
      />
    </div>
  );
};

const AuditLogPage = () => {
  const currentUrl = window.location.href;
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);

  const pageSizeOptions = useMemo(
    () => PAGE_SIZE_OPTIONS.map((size) => ({ value: size.toString(), label: `${size} / page` })),
    []
  );

  const [quickFilters, setQuickFilters] = useState(() => ({ ...initialQuickFilters }));
  const [heavyLidOpen, setHeavyLidOpen] = useState(false);
  const [heavyDraft, setHeavyDraft] = useState("");
  /** `null` = no heavy search run yet this session while lid is open */
  const [appliedHeavyQ, setAppliedHeavyQ] = useState(null);

  const quickRef = useRef(quickFilters);
  quickRef.current = quickFilters;

  const runRequest = useDebouncedRequest(500);

  const loadLogs = useCallback(
    async (quick, pg, sz, q) => {
      setLoading(true);
      const params = { ...quick, page: pg, pageSize: sz };
      if (q) params.q = q;
      Object.keys(params).forEach(
        (k) => (params[k] === "" || params[k] == null) && delete params[k]
      );
      try {
        const res = await runRequest(({ signal }) =>
          api.get("/v2/admin/audit-log", { params, signal })
        );
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setLoading(false);
      } catch (err) {
        if (axios.isCancel(err)) return; // a newer request superseded this one
        setLogs([]);
        setTotal(0);
        setLoading(false);
      }
    },
    [runRequest]
  );

  // Quick mode: filter typing / pagination / sort changes all flow through
  // the debounced runner, so rapid edits coalesce into a single request.
  useEffect(() => {
    if (heavyLidOpen) return;
    loadLogs(quickFilters, page, pageSize, undefined);
  }, [heavyLidOpen, quickFilters, page, pageSize, loadLogs]);

  // Heavy mode: only react to a committed Search and pagination; quick
  // filter edits are read from the live ref so typing doesn't trigger
  // expensive scans.
  useEffect(() => {
    if (!heavyLidOpen) return;
    if (appliedHeavyQ === null) return;
    const q = appliedHeavyQ.trim() || undefined;
    loadLogs(quickRef.current, page, pageSize, q);
  }, [heavyLidOpen, appliedHeavyQ, page, pageSize, loadLogs]);

  const openHeavyLid = () => {
    setHeavyLidOpen(true);
    setAppliedHeavyQ(null);
    setHeavyDraft("");
  };

  const closeHeavyLid = () => {
    setHeavyLidOpen(false);
    setAppliedHeavyQ(null);
    setHeavyDraft("");
  };

  const runHeavySearch = () => {
    const nextQ = heavyDraft.trim();
    setAppliedHeavyQ(nextQ);
    setPage(1);
  };

  const handleQuickChange = (e) => {
    const { name, value } = e.target;
    setQuickFilters((f) => ({ ...f, [name]: value }));
    if (!heavyLidOpen) setPage(1);
  };

  const handleDateChange = (e) => {
    setQuickFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (!heavyLidOpen) setPage(1);
  };

  /** Re-clicking the same sort field does not change state, so force a refetch. */
  const handleSortField = (value) => {
    if (!heavyLidOpen && quickRef.current.sort === value) {
      loadLogs(quickRef.current, page, pageSize, undefined);
      return;
    }
    setQuickFilters((f) => ({ ...f, sort: value }));
    if (!heavyLidOpen) setPage(1);
  };

  /** Re-clicking the same order does not change state, so force a refetch. */
  const handleSortOrder = (value) => {
    if (!heavyLidOpen && quickRef.current.order === value) {
      loadLogs(quickRef.current, page, pageSize, undefined);
      return;
    }
    setQuickFilters((f) => ({ ...f, order: value }));
    if (!heavyLidOpen) setPage(1);
  };

  const navLocked = heavyLidOpen && appliedHeavyQ === null;

  const sortSelectValue = AUDIT_LOG_SORT_OPTIONS.find((o) => o.value === quickFilters.sort);

  return (
    <div className="auditlog-page">
      <MetaTags
        title="Audit Logs"
        description="Audit Logs"
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />

      <div className="auditlog-container page-content">
        <h1>Audit Logs</h1>
        <div className="auditlog-filters">
          <div className="auditlog-filters-row">
          <input
            name="userId"
            value={quickFilters.userId}
            onChange={handleQuickChange}
            placeholder="User ID"
          />
          <input
            name="action"
            value={quickFilters.action}
            onChange={handleQuickChange}
            placeholder="Action"
          />
          <input
            name="method"
            value={quickFilters.method}
            onChange={handleQuickChange}
            placeholder="Method"
          />
          <input
            name="route"
            value={quickFilters.route}
            onChange={handleQuickChange}
            placeholder="Route"
          />
          </div>
          <div className="auditlog-filters-row">
          <input
            type="date"
            name="startDate"
            value={quickFilters.startDate}
            onChange={handleDateChange}
            placeholder="Start Date"
          />
          <input
            type="date"
            name="endDate"
            value={quickFilters.endDate}
            onChange={handleDateChange}
            placeholder="End Date"
          />

          <div className="auditlog-filters-heavy">
            <div className={`auditlog-heavy-lid ${heavyLidOpen ? "auditlog-heavy-lid--open" : ""}`}>
              <div
                className={`auditlog-heavy-cover ${heavyLidOpen ? "auditlog-heavy-cover--lifted" : ""}`}
                onClick={() => !heavyLidOpen && openHeavyLid()}
                onKeyDown={(e) => {
                  if (!heavyLidOpen && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    openHeavyLid();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Open heavy search (payload and result)"
              >
                <span className="auditlog-heavy-cover-label">Heavy: payload / result</span>
              </div>
              {heavyLidOpen ? (
                <button
                  type="button"
                  className="auditlog-heavy-lid-peek"
                  onClick={closeHeavyLid}
                  aria-label="Lower lid and return to quick mode"
                >
                  <span className="auditlog-heavy-lid-peek-grip" aria-hidden />
                </button>
              ) : null}
              <div className="auditlog-heavy-lid-row">
                <input
                  aria-label="Heavy search in payload or result"
                  value={heavyDraft}
                  onChange={(e) => setHeavyDraft(e.target.value)}
                  placeholder="Slow LIKE — only runs when you press Search"
                  autoComplete="off"
                  disabled={!heavyLidOpen}
                />
                <button type="button" className="auditlog-heavy-search-btn" onClick={runHeavySearch} disabled={!heavyLidOpen}>
                  Search
                </button>
              </div>
            </div>
            <p className="auditlog-mode-hint">
              {heavyLidOpen
                ? "Heavy mode: only Search loads data. Click the lid tab on the right to close. Quick filters apply on Search and on page changes after that."
                : "Quick mode: filters above debounce (500ms) and never scan payload/result."}
            </p>
            </div>
          </div>
        </div>
        <div className="sort auditlog-sort-block">
            <div className="sort-option">
              <CustomSelect
                value={sortSelectValue}
                onChange={(option) => option && handleSortField(option.value)}
                options={AUDIT_LOG_SORT_OPTIONS}
                label="Sort by"
                width="14rem"
              />
              <div className="order">
                <p>Order</p>
                <div className="wrapper">
                  <SortAscIcon
                    className="svg-fill"
                    style={{
                      backgroundColor: quickFilters.order === "ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSortOrder("ASC")}
                  />
                  <SortDescIcon
                    className="svg-fill"
                    style={{
                      backgroundColor: quickFilters.order === "DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSortOrder("DESC")}
                  />
                </div>
              </div>
            </div>
          </div>
        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
          pageSizeOptions={pageSizeOptions}
          navLocked={navLocked}
        />
        <div className="auditlog-card-list">
          {loading ? (
            <div>Loading...</div>
          ) : logs.length === 0 ? (
            <div>No logs found.</div>
          ) : (
            logs.map((log) => <AuditLogCard key={log.id} log={log} user={log.user} />)
          )}
        </div>
        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
          pageSizeOptions={pageSizeOptions}
          navLocked={navLocked}
        />
      </div>
    </div>
  );
};

export default AuditLogPage;
