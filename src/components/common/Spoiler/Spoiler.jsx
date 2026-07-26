// tuf-search: #Spoiler #spoiler #common
import { useState } from "react";
import PropTypes from "prop-types";
import "./spoiler.css";

/**
 * Click-to-reveal wrapper. Content stays blurred / unselectable until activated.
 */
const Spoiler = ({
  children,
  label = "Click to reveal",
  hideLabel = "Click to hide",
  className = "",
  defaultRevealed = false,
}) => {
  const [revealed, setRevealed] = useState(defaultRevealed);

  return (
    <button
      type="button"
      className={[
        "spoiler",
        revealed ? "spoiler--revealed" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => setRevealed((prev) => !prev)}
      aria-expanded={revealed}
      title={revealed ? hideLabel : label}
    >
      <span className="spoiler__content" aria-hidden={!revealed}>
        {children}
      </span>
      {!revealed ? <span className="spoiler__hint">{label}</span> : null}
    </button>
  );
};

Spoiler.propTypes = {
  children: PropTypes.node.isRequired,
  label: PropTypes.string,
  hideLabel: PropTypes.string,
  className: PropTypes.string,
  defaultRevealed: PropTypes.bool,
};

export default Spoiler;
