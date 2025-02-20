import React, { useEffect } from "react";
import "./Login.css";
import Input from '../../../components/inputComponent/Input';
import Button from '../../../components/buttonComponent/Button';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
const Login = () => {
  const [activeTab, setActiveTab] = useState("phone");
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => {
    document.title = "Đăng nhập - Talko Chat";
  }, []);
  const handleLogin = () => {
    navigate("/main");
  };
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={require('../../../assets/images/Talko_Logo.png')} alt="Talko Logo" style={{width:"100px", height:"100px"}}/>
          <p>Đăng nhập tài khoản Talko để kết nối với ứng dụng Talko Chat</p>
        </div>
        <div className="login-options">
          <button
            className={`tab-button ${activeTab === "qr" ? "active" : ""}`}
            onClick={() => setActiveTab("qr")}
          >
            Với mã QR
          </button>
          <button
            className={`tab-button ${activeTab === "phone" ? "active" : ""}`}
            onClick={() => setActiveTab("phone")}
          >
            Với số điện thoại
          </button>
        </div>

        {activeTab === "phone" && (
          <div className="login-form">
            <form>
              <div className="input-group">
                <label>Số điện thoại</label>
                <Input type="tel" placeholder="94344xxxx" value={phone} onChange={setPhone}/>
              </div>
              <div className="input-group">
                <label>Mật khẩu</label>
                <Input type="password" placeholder="Nhập mật khẩu" value={password} onChange={setPassword}/>
              </div>
              {/* <button type="submit" className="login-button" onClick={handleLogin}>
                Đăng nhập với mật khẩu
              </button> */}
              <Button className="button-primary" type="submit" onClick={handleLogin} children="Đăng nhập với mật khẩu"/>
              <a href="/forgotpassword" className="forgot-password">
                Quên mật khẩu?
              </a>
            </form>
          </div>
        )}

        {activeTab === "qr" && (
          <div className="qr-section">
            <p>Quét mã QR để đăng nhập nhanh</p>
            <div className="qr-code-placeholder">
              {/* Placeholder cho mã QR */}
              <p>[QR CODE]</p>
            </div>
          </div>
        )}

        <div className="register-link">
          <p>
            Bạn chưa có tài khoản? <a href="/register">Đăng ký ngay!</a>
          </p>
        </div>
      </div>

    </div>
  );
};

export default Login;
