// tuf-search: #Collapsible #collapsible #common
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import ChevronIcon from "@/components/common/icons/ChevronIcon";
import "./collapsible.css";

const CollapsibleContext = createContext(null);

const DIRECTION_AXIS = {
  down: "vertical",
  up: "vertical",
  left: "horizontal",
  right: "horizontal",
};

function resolveAxis(direction, axis) {
  if (axis === "vertical" || axis === "horizontal") return axis;
  return DIRECTION_AXIS[direction] ?? "vertical";
}

function useControllableState({ value, defaultValue, onChange }) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? false);
  const isControlled = value !== undefined;
  const open = isControlled ? value : uncontrolled;

  const setOpen = useCallback(
    (next) => {
      const resolved = typeof next === "function" ? next(open) : next;
      if (!isControlled) setUncontrolled(resolved);
      onChange?.(resolved);
    },
    [isControlled, onChange, open],
  );

  return [open, setOpen];
}

export function useCollapsible() {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) {
    throw new Error("useCollapsible must be used within a Collapsible");
  }
  return ctx;
}

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function CollapsibleTriggerIndicator({ preset, direction, open }) {
  if (preset === "none") return null;

  if (preset === "chevron") {
    const chevronDirection =
      direction === "up"
        ? "up"
        : direction === "left"
          ? "left"
          : direction === "right"
            ? "right"
            : "down";
    return (
      <span
        className={mergeClassNames(
          "tuf-collapsible__trigger-indicator",
          "tuf-collapsible__trigger-indicator--chevron",
          open && "tuf-collapsible__trigger-indicator--open",
        )}
        aria-hidden
      >
        <ChevronIcon direction={chevronDirection} size={16} />
      </span>
    );
  }

  if (preset === "plusMinus") {
    return (
      <span
        className={mergeClassNames(
          "tuf-collapsible__trigger-indicator",
          "tuf-collapsible__trigger-indicator--plus-minus",
          open && "tuf-collapsible__trigger-indicator--open",
        )}
        aria-hidden
      >
        <span className="tuf-collapsible__plus-minus-bar tuf-collapsible__plus-minus-bar--h" />
        <span className="tuf-collapsible__plus-minus-bar tuf-collapsible__plus-minus-bar--v" />
      </span>
    );
  }

  if (preset === "caret") {
    return (
      <span
        className={mergeClassNames(
          "tuf-collapsible__trigger-indicator",
          "tuf-collapsible__trigger-indicator--caret",
          `tuf-collapsible__trigger-indicator--caret-${direction}`,
          open && "tuf-collapsible__trigger-indicator--open",
        )}
        aria-hidden
      />
    );
  }

  return null;
}

export function Collapsible({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  axis: axisProp,
  direction = "down",
  duration = "0.4s",
  easing = "var(--ease-out-expo)",
  disabled = false,
  revealOverflow = false,
  fade = true,
  className = "",
  style,
  children,
  ...rest
}) {
  const contentId = useId();
  const axis = resolveAxis(direction, axisProp);
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const toggle = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => !prev);
  }, [disabled, setOpen]);

  const contextValue = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      disabled,
      direction,
      axis,
      contentId,
      duration,
      easing,
      revealOverflow,
      fade,
    }),
    [
      open,
      setOpen,
      toggle,
      disabled,
      direction,
      axis,
      contentId,
      duration,
      easing,
      revealOverflow,
      fade,
    ],
  );

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <div
        className={mergeClassNames(
          "tuf-collapsible",
          `tuf-collapsible--${axis}`,
          `tuf-collapsible--${direction}`,
          open && "tuf-collapsible--open",
          disabled && "tuf-collapsible--disabled",
          className,
        )}
        data-state={open ? "open" : "closed"}
        data-direction={direction}
        data-axis={axis}
        style={{
          "--tuf-collapsible-duration": duration,
          "--tuf-collapsible-ease": easing,
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({
  preset = "chevron",
  asChild = false,
  className = "",
  children,
  onClick,
  type = "button",
  ...rest
}) {
  const { open, toggle, disabled, direction, contentId } = useCollapsible();

  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    toggle();
  };

  const triggerProps = {
    type: asChild ? undefined : type,
    className: mergeClassNames(
      "tuf-collapsible__trigger",
      preset !== "none" && `tuf-collapsible__trigger--preset-${preset}`,
      className,
    ),
    "aria-expanded": open,
    "aria-controls": contentId,
    "data-state": open ? "open" : "closed",
    disabled: disabled || rest.disabled,
    onClick: handleClick,
    ...rest,
  };

  const indicator = (
    <CollapsibleTriggerIndicator preset={preset} direction={direction} open={open} />
  );

  if (asChild) {
    const child = React.Children.only(children);
    return React.cloneElement(child, {
      ...triggerProps,
      className: mergeClassNames(child.props.className, triggerProps.className),
      onClick: (event) => {
        child.props.onClick?.(event);
        handleClick(event);
      },
      children: (
        <>
          {child.props.children}
          {preset !== "none" ? indicator : null}
        </>
      ),
    });
  }

  return (
    <button {...triggerProps}>
      {children}
      {indicator}
    </button>
  );
}

export function CollapsibleContent({
  className = "",
  clipClassName = "",
  forceMount = false,
  children,
  ...rest
}) {
  const {
    open,
    direction,
    axis,
    contentId,
    duration,
    revealOverflow,
    fade,
  } = useCollapsible();

  const regionRef = useRef(null);
  const [overflowRevealed, setOverflowRevealed] = useState(false);
  const [mounted, setMounted] = useState(open || forceMount);
  const [expanded, setExpanded] = useState(open && (forceMount || mounted));

  useEffect(() => {
    if (open || forceMount) setMounted(true);
  }, [open, forceMount]);

  useEffect(() => {
    if (!mounted) {
      setExpanded(false);
      return undefined;
    }
    if (!open) {
      const frame = requestAnimationFrame(() => setExpanded(false));
      return () => cancelAnimationFrame(frame);
    }
    const frame = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(frame);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) setOverflowRevealed(false);
  }, [open]);

  useEffect(() => {
    if (open || forceMount || !mounted) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mq.matches) return;
    setMounted(false);
  }, [open, forceMount, mounted]);

  const handleTransitionEnd = (event) => {
    if (event.target !== regionRef.current) return;
    const prop =
      axis === "horizontal" ? "grid-template-columns" : "grid-template-rows";
    if (event.propertyName !== prop) return;
    if (expanded && revealOverflow) setOverflowRevealed(true);
    if (!open) {
      setOverflowRevealed(false);
      if (!forceMount) setMounted(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      id={contentId}
      role="region"
      aria-hidden={!open}
      className={mergeClassNames(
        "tuf-collapsible__region",
        `tuf-collapsible__region--${axis}`,
        `tuf-collapsible__region--${direction}`,
        expanded && "is-open",
        fade && "tuf-collapsible__region--fade",
        className,
      )}
      ref={regionRef}
      data-state={open ? "open" : "closed"}
      onTransitionEnd={handleTransitionEnd}
      style={{ "--tuf-collapsible-duration": duration }}
      {...rest}
    >
      <div
        className={mergeClassNames(
          "tuf-collapsible__clip",
          `tuf-collapsible__clip--${direction}`,
          revealOverflow &&
            overflowRevealed &&
            "tuf-collapsible__clip--overflow-visible",
          clipClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

Collapsible.propTypes = {
  open: PropTypes.bool,
  defaultOpen: PropTypes.bool,
  onOpenChange: PropTypes.func,
  axis: PropTypes.oneOf(["vertical", "horizontal"]),
  direction: PropTypes.oneOf(["down", "up", "left", "right"]),
  duration: PropTypes.string,
  easing: PropTypes.string,
  disabled: PropTypes.bool,
  revealOverflow: PropTypes.bool,
  fade: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  children: PropTypes.node,
};

CollapsibleTrigger.propTypes = {
  preset: PropTypes.oneOf(["chevron", "plusMinus", "caret", "none"]),
  asChild: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
  type: PropTypes.string,
};

CollapsibleContent.propTypes = {
  className: PropTypes.string,
  clipClassName: PropTypes.string,
  forceMount: PropTypes.bool,
  children: PropTypes.node,
};

export default Collapsible;
