// import "./App.css";
// import {
//   RouterProvider,
//   createBrowserRouter,
//   Navigate,
//   Outlet,
// } from "react-router-dom";
// import Auth from "./screen/auth";
// import Home from "./screen/Home";
// import NotFoundPage from "./components/NotFoundPage/NotFoundPage";
// import { useDispatch, useSelector } from "react-redux";
// import { fetchUserProfile } from "./redux/globalSlice";
// import { useEffect, useState } from "react";
// import ChatLayout from "layout/ChatLayout";
// import { fetchInfoWebs } from "screen/Home/homeSlice";
// import Account from "screen/Account";
// import LoginPage from "screen/Account/pages/LoginPage";
// import RegistryPage from "screen/Account/pages/RegistryPage";

// // ProtectedRoute component sử dụng Outlet
// const ProtectedRoute = () => {
//   const isLogin = useSelector((state) => state.global?.isLogin);
//   return isLogin ? <Outlet /> : <Navigate to="/account/login" replace />;
// };

// // AdminProtectedRoute component
// const AdminProtectedRoute = () => {
//   const { user } = useSelector((state) => state.global);
//   return user?.isAdmin ? <Outlet /> : <Navigate to="/account/login" replace />;
// };

// // Root component để xử lý logic chung
// const Root = () => {
//   const dispatch = useDispatch();
//   const [isFetch, setIsFetch] = useState(false);
//   const { user } = useSelector((state) => state.global);
//   const isLogin = useSelector((state) => state.global?.isLogin);

//   useEffect(() => {
//     const fetchProfile = async () => {
//       const token = localStorage.getItem("token");
//       if (token) await dispatch(fetchUserProfile());
//       setIsFetch(true);
//     };
//     fetchProfile();
//   }, [dispatch]);

//   // useEffect(() => {
//   //   dispatch(fetchInfoWebs());
//   // }, [dispatch]);

//   if (!isFetch) return null;

//   // Auto-redirect logic
//   if (user) {
//     if (user.isAdmin) {
//       return <Navigate to="/admin" replace />;
//     } else {
//       return <Navigate to="/chat" replace />;
//     }
//   }

//   return <Outlet />;
// };

// // Định nghĩa router bằng createBrowserRouter
// const router = createBrowserRouter([
//   {
//     path: "/",
//     element: <Root />,
//     children: [
//       {
//         index: true,
//         element: <Home />,
//       },
//       {
//         path: "chat",
//         element: <ProtectedRoute />,
//         children: [
//           {
//             index: true,
//             element: <ChatLayout />,
//           },
//         ],
//       },
//       {
//         path: "admin",
//         element: <AdminProtectedRoute />,
//         children: [
//           {
//             index: true,
//             element: <div>Admin Page</div>, // Thay thế bằng component Admin thực tế
//           },
//         ],
//       },
//       {
//         path: "account",
//         children: [
//           {
//             index: true,
//             element: <Account />,
//           },
//           {
//             path: "login",
//             element: <LoginPage />,
//           },
//           {
//             path: "registry",
//             element: <RegistryPage />,
//           },
//         ],
//       },
//       // {
//       //   path: "call-video/:conversationId",
//       //   element: <ProtectedRoute />,
//       //   children: [
//       //     {
//       //       index: true,
//       //       element: <CallVideo />,
//       //     }
//       //   ]
//       // },
//       {
//         path: "*",
//         element: <NotFoundPage />,
//       },
//     ],
//   },
// ]);

// function App() {
//   return <RouterProvider router={router} />;
// }

// export default App;
