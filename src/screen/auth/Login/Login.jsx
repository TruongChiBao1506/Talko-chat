import React, { useEffect } from "react";
import "./Login.css";
import Input from '../../../components/inputComponent/Input';
import Button from '../../../components/buttonComponent/Button';
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setLogin } from '../../../redux/globalSlice';
import authApi from "../../../apis/authApi";
import { useDispatch } from "react-redux";
import {setLoading} from '../authSlice';
import {message} from 'antd'
const Login = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("account");
  const navigate = useNavigate();
  const [account, setAccount] = useState(location.state?.account || '');
  const [password, setPassword] = useState("");
  
  useEffect(() => {
    document.title = "Đăng nhập - Talko Chat";
  }, []);

  const handleLogin = async (username, password) => {
    if(!username || !password) {
      message.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    try {
      dispatch(setLoading(true));
      const {token, refreshToken} = await authApi.login(username, password);
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refreshToken);
      dispatch(setLogin(true));
      navigate("/chat");
      window.location.reload();
      message.success("Đăng nhập thành công");
    } catch (error) {
      console.log(error);
      navigate("/auth/login");
      message.error("Tài khoản hoặc mật khẩu không đúng");
    }
    dispatch(setLoading(false));
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
            className={`tab-button ${activeTab === "account" ? "active" : ""}`}
            onClick={() => setActiveTab("account")}
          >
            Với tài khoản
          </button>
        </div>
        
        {activeTab === "account" && (
          <div className="login-form">
            <form onSubmit={(e)=> {
              e.preventDefault();
              handleLogin(account, password)}}>
              <div className="input-group">
                <label>Tài khoản</label>
                <Input type="text" placeholder="Email hoặc số điện thoại" value={account} onChange={(value)=> setAccount(value)}/>
              </div>
              <div className="input-group">
                <label>Mật khẩu</label>
                <Input type="password" placeholder="Nhập mật khẩu" value={password} onChange={(value)=>setPassword(value)}/>
              </div>
              <Button className="button-primary" type="submit" children="Đăng nhập với mật khẩu"/>
              <a href="/auth/forgotpassword" className="forgot-password">
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
            Bạn chưa có tài khoản? <a href="/auth/register">Đăng ký ngay!</a>
          </p>
        </div>
      </div>

    </div>
  );
};

export default Login;
