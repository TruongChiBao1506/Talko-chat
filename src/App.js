import "./App.css";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Auth from "./screen/auth";
import Home from "./screen/Home";
import NotFoundPage from "./components/NotFoundPage/NotFoundPage";
import Chat from "./screen/Chat";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatLayout from "layout/ChatLayout";
import { fetchInfoWebs } from "screen/Home/homeSlice";
import Account from "screen/Account";
import LoginPage from "screen/Account/pages/LoginPage";
import RegistryPage from "screen/Account/pages/RegistryPage";
import ForgotPage from "screen/Account/pages/ForgotPage";
import { fetchUserProfile } from "app/globalSlice";
import meApi from "api/meApi";

function App() {
  const navigate = useNavigate();

  const dispatch = useDispatch();
  const [isFetch, setIsFetch] = useState(false);

  const isLogin = useSelector((state) => state.global?.isLogin);
  console.log("🚀 ~ App ~ isLogin:", isLogin);

  const { user } = useSelector((state) => state.global);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      console.log("🚀 ~ fetchProfile ~ token:", token);

      if (token) await dispatch(fetchUserProfile());

      // const user1 = await meApi.fetchProfile();
      // console.log("🚀 ~ user:", user1);
      setIsFetch(true);
    };
    fetchProfile();
  }, []);

  console.log("🚀 ~ App ~ user:", user);

  // useEffect(() => {
  //   dispatch(fetchInfoWebs());
  // }, []);

  // Điều hướng dựa trên user trong useEffect
  // useEffect(() => {
  //   if (user) {
  //     if (user.isAdmin) {
  //       navigate("/admin");
  //     } else {
  //       navigate("/chat");
  //     }
  //   }
  // }, [user, navigate]);

  if (!isFetch) return "";

  // return (
  //   <Router>
  //     <Routes>
  //       <Route path="/" element={<Home />} />
  //       <Route
  //         path="/auth/*"
  //         element={isLogin ? <Navigate to="/main" /> : <Auth />}
  //       />
  //       <Route path="/main" element={<Chat />} />
  //       <Route path="*" element={<NotFoundPage />} />

  //       {/* <ProtectedRoute path="/chat" component={ChatLayout} /> */}
  //       <Route path="/account" component={Account} />

  //       <Route component={NotFoundPage} />
  //     </Routes>
  //   </Router>
  // );

  return (
    // <BrowserRouter>
    <div className="App">
      <Routes>
        <Route exact path="/" element={<Home />} />

        {/* <Route exact path="/jf-link/:conversationId" element={<JoinFromLink />} /> */}

        {/* Các route yêu cầu đăng nhập */}
        <Route
          path="/chat/*"
          element={
            <ProtectedRoute>
              <ChatLayout />
            </ProtectedRoute>
          }
        />

        {/* <Route path="/admin" element={<AdminProtectedRoute />}>
                    <Route path="/admin" element={<Admin />} />
                </Route> */}

        {/* <Route path="/call-video/:conversationId" element={<ProtectedRoute />}>
                    <Route path="/call-video/:conversationId" element={<CallVideo />} />
                </Route> */}

        {/* Các route cho tài khoản */}
        {/* <Route
          path="/account"
          element={isLogin ? <Navigate to="/chat" /> : <Account />}
        />
        <Route
          path="/account/login"
          element={isLogin ? <Navigate to="/chat" /> : <LoginPage />}
        />
        <Route
          path="/account/registry"
          element={isLogin ? <Navigate to="/chat" /> : <RegistryPage />}
        />
        <Route
          path="/account/forgot"
          element={isLogin ? <Navigate to="/chat" /> : <ForgotPage />}
        /> */}

        {/* Các route cho tài khoản - path="/account/*" để bắt tất cả các route con */}
        <Route
          path="/account/*"
          element={isLogin ? <Navigate to="/chat" /> : <Account />}
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
    // </BrowserRouter>
  );
}

export default App;
