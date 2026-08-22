// tuf-search: #Select #selectors #select
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactSelect, { components } from 'react-select';
import { getPortalRoot } from '@/utils/portalRoot';
import { computeSelectMenuPlacement, estimateSelectMenuHeight } from './selectMenuPlacement';
import './select.css';

/** Map `direction` shorthand to react-select `menuPlacement`. */
function resolveMenuPlacement(direction, menuPlacementProp, autoPlacement) {
  if (menuPlacementProp != null && menuPlacementProp !== '') {
    return menuPlacementProp;
  }
  if (direction === 'up') return 'top';
  if (direction === 'auto') return autoPlacement;
  return 'bottom';
}

const EMPTY_OPTIONS = [];

/** Module-level so react-select does not remount the menu (and replay open animation) on parent re-renders. */
function AnimatedMenu(menuProps) {
  const { children, placement, ...rest } = menuProps;
  const isClosing = Boolean(menuProps.selectProps?.isClosing);
  const placementClass =
    placement === 'top' ? 'custom-select-menu--top' : 'custom-select-menu--bottom';
  return (
    <components.Menu
      {...rest}
      placement={placement}
      className={`custom-select-menu ${placementClass}${isClosing ? ' closing' : ''}`}
    >
      {children}
    </components.Menu>
  );
}

const DEFAULT_COMPONENTS = {Menu: AnimatedMenu};

const CustomSelect = ({
  options = EMPTY_OPTIONS,
  value,
  onChange,
  label,
  width = "12rem",
  maxHeight = "",
  /** Shorthand: `down` (default), `up` (menu above control), or `auto`. Overridden by `menuPlacement`. */
  direction = "down",
  menuPlacement: menuPlacementProp,
  menuPortalTarget,
  backgroundColor = "rgba(255, 255, 255, 0.2)",
  placeholderColor = "#fff8",
  components: userComponents,
  ...props
}) => {
  const containerRef = useRef(null);
  const [autoPlacement, setAutoPlacement] = useState('bottom');
  const usesAutoPlacement = direction === 'auto' && (menuPlacementProp == null || menuPlacementProp === '');
  const menuPlacement = resolveMenuPlacement(direction, menuPlacementProp, autoPlacement);
  const [isClosing, setIsClosing] = useState(false);
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const closeTimeoutRef = useRef(null);

  const measureAutoPlacement = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 'bottom';
    const optionCount = Array.isArray(options) ? options.length : 0;
    const menuHeight = estimateSelectMenuHeight({ optionCount, maxHeight });
    return computeSelectMenuPlacement(el, menuHeight);
  }, [options, maxHeight]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleMenuClose = useCallback(() => {
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false);
      setMenuIsOpen(false);
    }, 300);
  }, []);

  const handleMenuOpen = useCallback(() => {
    setIsClosing(false);
    if (usesAutoPlacement) {
      setAutoPlacement(measureAutoPlacement());
    }
    setMenuIsOpen(true);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
  }, [usesAutoPlacement, measureAutoPlacement]);

  const handleChange = useCallback((option) => {
    onChange(option);
    handleMenuClose();
  }, [onChange, handleMenuClose]);

  const mergedComponents = userComponents
    ? {Menu: AnimatedMenu, ...userComponents}
    : DEFAULT_COMPONENTS;

  const customStyles = useMemo(() => ({
    input: (base) => ({
      ...base, 
      color: "#fff"
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    container: (provided) => ({
      ...provided,
      zIndex: 20,
    }),
    control: (provided) => ({
      ...provided,
      width: width,
      backgroundColor: backgroundColor,
      border: "none",
      outline: "none",
      color: "#fff",
      cursor: "pointer",
      transition: "all 0.2s ease-in-out",
      "&:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "#FFFFFF",
      fontWeight: 500
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: "rgba(255, 255, 255, 0.7)",
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0)',
      transition: 'transform 0.2s ease',
      "&:hover": {
        color: "#fff"
      }
    }),
    menu: (provided, state) => ({
      ...provided,
      backgroundColor: "rgba(0, 0, 0, 0.95)",
      backdropFilter: "blur(8px)",
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
      overflow: "hidden",
      zIndex: 9999,
      marginTop: state.placement === 'top' ? 0 : '4px',
      marginBottom: state.placement === 'top' ? '4px' : 0,
      maxHeight: maxHeight
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "rgba(74, 144, 226, 0.3)"
        : "transparent",
      color: "#fff",
      cursor: "pointer",
      transition: "all 0.15s ease-in-out",
      padding: "8px 12px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      "&:hover": {
        backgroundColor: "rgba(85, 85, 85, 0.8)",
        paddingLeft: "1.5rem"
      }
    }),
    menuList: (base) => ({
      ...base,
      padding: "4px",
      "&::-webkit-scrollbar": {
        width: "8px",
        height: "0px",
      },
      "&::-webkit-scrollbar-track": {
        background: "transparent"
      },
      "&::-webkit-scrollbar-thumb": {
        background: "rgba(255, 255, 255, 0.2)",
        borderRadius: "4px",
        "&:hover": {
          background: "rgba(255, 255, 255, 0.3)"
        }
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: placeholderColor
    })
  }), [width, backgroundColor, placeholderColor, maxHeight]);

  return (
    <div
      ref={containerRef}
      className="custom-select-container"
      style={{ width: width }}
      onMouseDown={(e) => {
        // Prevent right-clicks and stop propagation to prevent popup from closing
        if (e.button !== 0) {
          e.preventDefault();
        }
        e.stopPropagation();
      }}
      onContextMenu={(e) => {
        // Prevent context menu on right-click
        e.preventDefault();
      }}
    >
      {label && <p className="custom-select-label">{label}</p>}
      <div className="custom-select-wrapper">
        <ReactSelect
          value={value}
          onChange={handleChange}
          options={Array.isArray(options) ? options : EMPTY_OPTIONS}
          menuPortalTarget={menuPortalTarget ?? getPortalRoot()}
          menuPlacement={menuPlacement}
          menuShouldScrollIntoView={false}
          menuPosition="fixed"
          classNamePrefix="custom-select"
          styles={customStyles}
          components={mergedComponents}
          menuIsOpen={menuIsOpen}
          onMenuOpen={handleMenuOpen}
          onMenuClose={handleMenuClose}
          isClosing={isClosing}
          {...props}
        />
      </div>
    </div>
  );
};

export default CustomSelect; 