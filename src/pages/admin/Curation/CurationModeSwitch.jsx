// tuf-search: #CurationModeHeader #curationRating
import { Link } from 'react-router-dom';
import './curationModeSwitch.css';

export function CurationModeHeader({ to, label, children }) {
  return (
    <div className="curation-mode-header curation-header">
      <Link to={to} className="curation-header__switch">
        {label}
      </Link>
      <div className="curation-header__titles">
        {children}
      </div>
      <span className="curation-header__spacer" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
