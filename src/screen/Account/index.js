import { Spin } from "antd";
import NotFoundPage from "components/NotFoundPage";
import React from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom"; // Thay useMatch bằng useLocation
import { Routes, Route } from "react-router-dom"; // Thay Switch bằng Routes
import ForgotPage from "./pages/ForgotPage";
import LoginPage from "./pages/LoginPage";
import RegistryPage from "./pages/RegistryPage";
import "./style.scss";

function Account(props) {
  const location = useLocation(); // Dùng useLocation để lấy đường dẫn hiện tại
  console.log("🚀 ~ Account ~ location:", location);

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
          {/* Dùng location.pathname để xây dựng các đường dẫn con */}
          <Route path={`${location.pathname}/login`} element={<LoginPage />} />
          <Route
            path={`${location.pathname}/registry`}
            element={<RegistryPage />}
          />
          <Route
            path={`${location.pathname}/forgot`}
            element={<ForgotPage />}
          />
          <Route path="*" element={<NotFoundPage />} />{" "}
        </Routes>
      </div>
      
    </Spin>
  );
}

export default Account;
