import { useEffect, useState, useMemo } from "react";
import { CompleteNav } from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import api from "@/utils/api";
import "./auditlogpage.css";
import AuditLogCard from "@/components/cards/AuditLogCard";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const AuditLogPage = () => {
  const { t } = useTranslation("pages");
  const currentUrl = window.location.href;
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    userId: "",
    action: "",
    method: "",
    route: "",
    startDate: "",
    endDate: "",
    q: "",
    sort: "createdAt",
    order: "DESC",
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page,
        pageSize,
      };
      Object.keys(params).forEach(
        (k) => (params[k] === "" || params[k] == null) && delete params[k]
      );
      const res = await api.get("/v2/admin/audit-log", { params });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (e) {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [page, pageSize, filters]);

  const handleFilterChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleDateChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleSort = (field) => {
    setFilters((f) => ({
      ...f,
      sort: field,
      order: f.sort === field && f.order === "DESC" ? "ASC" : "DESC",
    }));
  };

  return (
    
    <div className="auditlog-page">
        <MetaTags
          title="Audit Logs"
          description="Audit Logs"
          url={currentUrl}
          image="/og-image.jpg"
          type="website"
        />
        <CompleteNav />
        <div className="background-level"></div>
      <div className="auditlog-container">
        <h1>Audit Logs</h1>
        <div className="auditlog-filters">
          <input
            name="userId"
            value={filters.userId}
            onChange={handleFilterChange}
            placeholder="User ID"
          />
          <input
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
            placeholder="Action"
          />
          <input
            name="method"
            value={filters.method}
            onChange={handleFilterChange}
            placeholder="Method"
          />
          <input
            name="route"
            value={filters.route}
            onChange={handleFilterChange}
            placeholder="Route"
          />
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleDateChange}
            placeholder="Start Date"
          />
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleDateChange}
            placeholder="End Date"
          />
          <input
            name="q"
            value={filters.q}
            onChange={handleFilterChange}
            placeholder="Search"
          />
        </div>
        <div className="auditlog-card-list">
          {loading ? (
            <div>Loading...</div>
          ) : logs.length === 0 ? (
            <div>No logs found.</div>
          ) : (
            logs.map((log) => (
              <AuditLogCard key={log.id} log={log} user={log.user} />
            ))
          )}
        </div>
        <div className="auditlog-pagination">
          <span>
            Page {page} of {Math.ceil(total / pageSize) || 1}
          </span>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Prev
          </button>
          <button
            onClick={() => setPage((p) => (p * pageSize < total ? p + 1 : p))}
            disabled={page * pageSize >= total}
          >
            Next
          </button>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage; 