import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Route } from "react-router-dom";

const ProtectedRoute = ({ children, isAdmin = false }) => {
  // const { user } = useSelector((state) => state.global);

  // return (
  //   <Route
  //     {...rest}
  //     render={(props) => {
  //       if (user && !user.isAdmin) return <Component {...props} />;

  //       return (
  //         <Navigate
  //           to={{
  //             pathname: "/account/login",
  //             state: {
  //               from: props.location,
  //             },
  //           }}
  //         />
  //       );
  //     }}
  //   />
  // );

  const global = useSelector((state) => state.global || {});
  const isLogin = global.isLogin || false;
  const user = global.user || null;
  console.log("🚀 ~ ProtectedRoute ~ user:", user);

  if (!isLogin) {
    return <Navigate to="/account/login" />;
  }

  // if (isAdmin && (!user || !user.isAdmin)) {
  //   return <Navigate to="/" />;
  // }

  return children;
};

export default ProtectedRoute;
