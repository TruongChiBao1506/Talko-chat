import React, { forwardRef, useState } from "react";
import "./input.css";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";

const Input = forwardRef(({ type, placeholder, value, onChange, style={}}, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    // Xử lý toggle ẩn/hiện mật khẩu
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };
    // Xác định type thực tế dựa trên showPassword khi là password
    const inputType = type === "password" && showPassword ? "text" : type;
    
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
                type={inputType}
                ref={ref}
                className="input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{ padding: "10px 16px", ...style}}
            />
            {type === "password" && (
                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        padding: 0,
                    }}
                >
                    {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </button>
            )}
        </div>
    )
});

export default Input;