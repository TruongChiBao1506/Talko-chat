import React, { forwardRef } from "react";
import "./input.css";

const Input = forwardRef(({ type, placeholder, value, onChange, style={}}, ref) => {
    return type === 'tel' ? (
        <div className="input-container">
            <div className="country-code">
                <span>+84</span>
                {/* <span className="dropdown-arrow">▼</span> */}
            </div>
            <input
                type={type}
                ref={ref}
                className="input"
                value={value}
                style={style}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                pattern="[0-9]{10}"
            />
        </div>
    ) : (
        <div className="input-container">
            <input
                type={type}
                className="input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{ padding: "10px 16px", ...style}}
            />
        </div>
    )
});

export default Input;