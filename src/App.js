import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
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

function App() {
  const dispatch = useDispatch();
  const [isFetch, setIsFetch] = useState(false);
  const isLogin = useSelector((state) => state.global?.isLogin);
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (token) await dispatch(fetchUserProfile());
      setIsFetch(true);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    dispatch(fetchInfoWebs());
  }, []);

  if (!isFetch) return "";

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* <Route
          path="/auth/*"
          element={isLogin ? <Navigate to="/main" /> : <Auth />}
        /> */}
        {/* <Route path="/main" element={<Chat />} /> */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}

        <ProtectedRoute path="/chat" component={ChatLayout} />
        {/* <Route path="/account" component={Account} /> */}

        <Route component={NotFoundPage} />
      </Routes>
    </Router>
  );
}

export default App;
