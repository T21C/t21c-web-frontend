import { useState } from "react";

function PrettyJSON({ value }) {
  console.log(value);
  console.log(typeof value);
  let parsedValue = value;
  if (typeof value === "string") {
    try {
      parsedValue = JSON.parse(value)
    } catch {
      parsedValue = value;
    }
  }
  return (
    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0, fontFamily: "monospace", fontSize: "1em", lineHeight: 1.6 }}>
      {typeof parsedValue === "object"
        ? JSON.stringify(parsedValue, null, 2)
        : String(parsedValue)}
    </pre>
  );
}

const methodColors = {
  GET: "#00bfff",
  POST: "#4caf50",
  PUT: "#ff9800",
  PATCH: "#ffc107",
  DELETE: "#f44336",
};

export default function AuditLogCard({ log, user }) {
  const [showPayload, setShowPayload] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const methodColor = methodColors[log.method] || "#888";
  const date = new Date(log.createdAt).toLocaleString();

  return (
    <div className="auditlog-card">
      <div className="auditlog-card-header">
        <span className="auditlog-method" style={{ color: methodColor }}>{log.method}</span>
        <span className="auditlog-action">{log.action}</span>
        <span className="auditlog-route">{log.route}</span>
        <span className="auditlog-user">
          {user ? (
            <>
              <span className="auditlog-user-name">{user.username}</span>
              {user.avatarUrl && (
                <img src={user.avatarUrl} alt="avatar" className="auditlog-user-avatar" />
              )}
            </>
          ) : (
            <span className="auditlog-user-id">{log.userId}</span>
          )}
        </span>
        <span className="auditlog-date">{date}</span>
      </div>
      <div className="auditlog-card-section">
        <button className="auditlog-expand-btn" onClick={() => setShowPayload((v) => !v)}>
          {showPayload ? "Hide" : "Show"} Payload
        </button>
        {showPayload && (
          <div className="auditlog-json-view auditlog-payload-view">
            <PrettyJSON value={log.payload} />
          </div>
        )}
      </div>
      <div className="auditlog-card-section">
        <button className="auditlog-expand-btn" onClick={() => setShowResult((v) => !v)}>
          {showResult ? "Hide" : "Show"} Result
        </button>
        {showResult && (
          <div className="auditlog-json-view auditlog-result-view">
            <PrettyJSON value={log.result} />
          </div>
        )}
      </div>
    </div>
  );
} 