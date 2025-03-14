import React, { useState, useRef, useEffect } from 'react';
import ReactSelect, { components } from 'react-select';
import './select.css';

const CustomSelect = ({
  options,
  value,
  onChange,
  label,
  width = "12rem",
  maxHeight = "",
  menuPortalTarget = document.body,
  backgroundColor = "rgba(255, 255, 255, 0.2)",
  placeholderColor = "#fff8",
  ...props
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const closeTimeoutRef = useRef(null);

  // Custom Menu component to handle animation
  const Menu = (props) => {
    const { children, ...rest } = props;
    return (
      <components.Menu {...rest} className={`custom-select-menu ${isClosing ? 'closing' : ''}`}>
        {children}
      </components.Menu>
    );
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleMenuClose = () => {
    setIsClosing(true);
    // Keep menu open during animation
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false);
      setMenuIsOpen(false);
    }, 300); // Slightly longer than animation duration for smooth transition
  };

  const handleMenuOpen = () => {
    setIsClosing(false);
    setMenuIsOpen(true);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
  };

  const customStyles = {
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
    control: (provided, state) => ({
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
        transform: "translateY(-1px)",
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
    menu: (provided) => ({
      ...provided,
      backgroundColor: "rgba(0, 0, 0, 0.95)",
      backdropFilter: "blur(8px)",
      borderRadius: "6px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
      overflow: "hidden",
      zIndex: 9999,
      margin: "4px 0",
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

  };

  return (
    <div className="custom-select-container">
      {label && <p className="custom-select-label">{label}</p>}
      <div className="custom-select-wrapper">
        <ReactSelect
          value={value}
          onChange={(option) => {
            onChange(option);
            handleMenuClose();
          }}
          options={options}
          menuPortalTarget={menuPortalTarget}
          classNamePrefix="custom-select"
          styles={customStyles}
          components={{ Menu }}
          menuIsOpen={menuIsOpen}
          onMenuOpen={handleMenuOpen}
          onMenuClose={handleMenuClose}
          {...props}
        />
      </div>
    </div>
  );
};

export default CustomSelect; 