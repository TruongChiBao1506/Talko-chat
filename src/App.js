import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  BrowserRouter,
  useNavigate,
} from "react-router-dom";
import Auth from "./screen/auth";
import Home from "./screen/Home";
import NotFoundPage from "./components/NotFoundPage/NotFoundPage";
import Chat from "./screen/Chat";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserProfile } from "./redux/globalSlice";
import { useEffect, useState } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatLayout from "layout/ChatLayout";
import { fetchInfoWebs } from "screen/Home/homeSlice";
import Account from "screen/Account";
import LoginPage from "screen/Account/pages/LoginPage";
import RegistryPage from "screen/Account/pages/RegistryPage";

function App() {
  const navigate = useNavigate();

  const dispatch = useDispatch();
  const [isFetch, setIsFetch] = useState(false);

  const isLogin = useSelector((state) => state.global?.isLogin);
  const { user } = useSelector((state) => state.global);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (token) await dispatch(fetchUserProfile());
      setIsFetch(true);
    };
    fetchProfile();
  }, []);

  // useEffect(() => {
  //   dispatch(fetchInfoWebs());
  // }, []);

  if (user) {
    if (user.isAdmin) navigate("/admin"); // Điều hướng đến trang admin
    else navigate("/chat"); // Điều hướng đến trang chat
  }

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
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route exact path="/" element={<Home />} />

          {/* <Route exact path="/jf-link/:conversationId" element={<JoinFromLink />} /> */}

          <Route path="/chat" element={<ProtectedRoute />}>
            <Route path="/chat" element={<ChatLayout />} />
          </Route>

          {/* <Route path="/admin" element={<AdminProtectedRoute />}>
                    <Route path="/admin" element={<Admin />} />
                </Route> */}

          {/* <Route path="/call-video/:conversationId" element={<ProtectedRoute />}>
                    <Route path="/call-video/:conversationId" element={<CallVideo />} />
                </Route> */}

          <Route path="/account" element={<Account />} />
          <Route path="/account/login" element={<LoginPage />} />
          <Route path="/account/registry" element={<RegistryPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
