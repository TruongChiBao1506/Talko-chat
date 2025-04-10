import { Spin } from "antd";
import NotFoundPage from "components/NotFoundPage";
import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom"; // Thay useMatch bằng useLocation
import { Routes, Route } from "react-router-dom"; // Thay Switch bằng Routes
import ForgotPage from "./pages/ForgotPage";
import LoginPage from "./pages/LoginPage";
import RegistryPage from "./pages/RegistryPage";
import "./style.scss";

function Account(props) {
  const navigate = useNavigate(); // Thay useHistory bằng useNavigate
  const { isLoading } = useSelector((state) => state.account);
  const { user } = useSelector((state) => state.global);
  const { infoWebApps } = useSelector((state) => state.home);

  // Kiểm tra nếu người dùng đã đăng nhập và điều hướng họ đến trang tương ứng
  if (user) {
    if (user.isAdmin) navigate("/admin"); // Điều hướng đến trang admin
    else navigate("/chat"); // Điều hướng đến trang chat
  }

  return (
    <Spin spinning={isLoading}>
      <div id="account_page">
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="registry" element={<RegistryPage />} />
          <Route path="forgot" element={<ForgotPage />} />
          <Route index element={<LoginPage />} />{" "}
          {/* Mặc định hiển thị LoginPage */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Spin>
  );
}

export default Account;
