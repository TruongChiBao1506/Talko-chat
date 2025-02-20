import React from "react";
import { Row, Col } from "antd";
import NavbarContainer from "./containers/NavbarContainer";
import SearchContainer from "./containers/SearchContainer";
import WelcomeScreen from "../../components/mainComponents/WelcomeScreen";
import './style.css';
function Chat() {
    return (
        <div id="main-chat-wrapper">
            <Row gutter={[0, 0]}>
                <Col
                    span={1}
                    xl={{ span: 1 }}
                    lg={{ span: 2 }}
                    md={{ span: 3 }}
                    sm={{ span: 4 }}
                    xs={{ span: 4 }}>
                    <div className="navbar-container">
                        <NavbarContainer />
                    </div>
                </Col>
                <Col
                    span={8}
                    xs={{ span: 18 }}
                    sm={{ span: 18 }}
                    md={{ span: 9 }}
                    lg={{ span: 8 }}
                    xl={{ span: 6 }}
                >
                    <div className="search-container">
                        <SearchContainer valueClassify="0"/>
                    </div>
                </Col>
                <Col
                    span={17}
                    xs={{ span: 0 }}
                    sm={{ span: 0 }}
                    md={{ span: 12 }}
                    lg={{ span: 14 }}
                    xl={{ span: 17 }}
                >
                    <div className="welcome-screen">
                        <WelcomeScreen />
                    </div>

                </Col>
            </Row>
        </div>
    )
};
export default Chat;