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
import ChatLayout from "./layout/ChatLayout";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserProfile } from "./redux/globalSlice";
import { useEffect, useState } from "react";
import FloatButton from "./components/FloatButton";

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
  }, [dispatch]);

  if (!isFetch) return "";

  return (
    <Router>
      {isLogin && <FloatButton />}
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/auth/*" element={<Auth />} />
        <Route path="/chat/*" element={<ChatLayout />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
