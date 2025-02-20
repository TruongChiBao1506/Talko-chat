import { Spin } from "antd";
import NotFoundPage from "components/NotFoundPage";
import React from "react";
import { useSelector } from "react-redux";
import { useHistory } from "react-router";
import { Route, Switch, useRouteMatch } from "react-router-dom";
import ForgotPage from "./pages/ForgotPassword";
import LoginPage from "./pages/Login";
import RegistryPage from "./pages/Register";
// import "./style.scss";

function Account(props) {
  const { url } = useRouteMatch();
  const history = useHistory();
  const { isLoading } = useSelector((state) => state.account);
  const { user } = useSelector((state) => state.global);

  if (user) {
    if (user.isAdmin) history.push("/admin");
    else history.push("/chat");
  }

  return (
    <Spin spinning={isLoading}>
      <div id="account_page">
        <Switch>
          <Route path={`${url}/login`} component={LoginPage} />
          <Route path={`${url}/registry`} component={RegistryPage} />
          <Route path={`${url}/forgot`} component={ForgotPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </div>
    </Spin>
  );
}

export default Account;
