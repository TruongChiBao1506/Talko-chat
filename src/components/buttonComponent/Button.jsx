import React from "react";
import "./Button.css";

const Button = ({ type, children, onClick, style={}, className }) => {
    return (
        <button type={type} className={className} style={style} onClick={onClick}>
            {children}
        </button>
    );
}

export default Button;
