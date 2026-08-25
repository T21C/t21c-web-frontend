// tuf-search: #TagConfidenceBar #tagConfidenceBar
import './tagconfidencebar.css';

export default function TagConfidenceBar({ score, show = false, children, className = '' }) {
  const clamped =
    typeof score === 'number' && Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0;

  return (
    <div className={`tag-confidence-bar ${className}`.trim()}>
      {children}
      {show ? (
        <span
          className="tag-confidence-bar__fill"
          style={{ '--tag-confidence': clamped }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
