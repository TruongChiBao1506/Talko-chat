import {
    ContactsOutlined, LockOutlined,
    LogoutOutlined,
    MessageOutlined,
    SettingOutlined, UserOutlined
} from '@ant-design/icons';
import { Badge, Button, Popover } from 'antd';
import PropTypes from 'prop-types';
import react, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import PersonalIcon from '../../components/PersonalIcon';
import './style.css';
import ModalUpdateProfile from '../../../../modals/ModalUpdateProfile';
import ModalChangePassword from '../../../../modals/ModalChangePassword';
import { setToTalUnread } from '../../slices/chatSlice';
import { setTabActive, setLogin } from '../../../../redux/globalSlice';
import NavbarStyle from './NavbarStyle';
import { closeConnection } from '../../../../utils/socketClient';
NavbarContainer.propTypes = {
    onSaveCodeRevoke: PropTypes.func,
};
function NavbarContainer({onSaveCodeRevoke = null}){
    const [visibleModalChangePassword, setvisibleModalChangePassword] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const { user, tabActive } = useSelector((state) => state.global);

    const { conversations, toTalUnread } = useSelector((state) => state.chat);
    const { amountNotify } = useSelector((state) => state.friend);
    //model
    const [isModalUpdateProfileVisible, setIsModalUpdateProfileVisible] =
        useState(false);

    const dispatch = useDispatch();
    const location = useLocation();

    const checkCurrentPage = (iconName) => {
        if (iconName === 'MESSAGE' && location.pathname === '/chat') {
            return true;
        }
        if (iconName === 'FRIEND' && location.pathname === '/chat/friends') {
            return true;
        }
        return false;
    }

    useEffect(() => {
        dispatch(setToTalUnread());
    }, [conversations]);


    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        // Đóng kết nối socket
        closeConnection();
        window.location.href = '/auth/login';
        dispatch(setLogin(false));
    };

    const handleSetTabActive = (value) => {
        dispatch(setTabActive(value));
    };

    // --- HANDLE UPDATE PROFILE
    const handleUpdateProfile = () => {
        console.log('handleUpdateProfile');
        
        setIsModalUpdateProfileVisible(true);
    };

    const handleCancelModalUpdateProfile = (value) => {
        setIsModalUpdateProfileVisible(value);
    };

    const handleOklModalUpdateProfile = (value) => {
        setConfirmLoading(true);
        setConfirmLoading(false);
        setIsModalUpdateProfileVisible(false);
    };

    const content = (
        <div className="pop_up-personal" >
            <div className="pop_up-personal--item" onClick={handleUpdateProfile}>
                <div className="pop_up-personal--item-icon">
                    <UserOutlined />
                </div>

                <div className="pop_up-personal--item-text" >Tài khoản</div>
            </div>

            <div className="pop_up-personal--item">
                <div className="pop_up-personal--item-icon">
                    <LogoutOutlined style={{color: "red"}}/>
                </div>

                <div
                    className="pop_up-personal--item-text_logout"
                    onClick={handleLogout}
                >
                    Đăng xuất
                </div>
            </div>
        </div>
    );
    
    

    const handleChangePassword = () => {
        setvisibleModalChangePassword(true);
    }



    const setting = (
        <div className="pop_up-personal">
            <div className="pop_up-personal--item" onClick={handleChangePassword}>
                <div className="pop_up-personal--item-icon">
                    <LockOutlined />
                </div>

                <div className="pop_up-personal--item-text">Đổi mật khẩu</div>
            </div>
        </div>
    );



    return (
        <div id="sidebar_wrapper">
            <div className="sidebar-main">
                <ul className="sidebar_nav">
                    <li className="sidebar_nav_item icon-avatar">
                        <Popover
                            placement="bottomLeft"
                            content={content}
                            trigger="click"
                        >
                            <Button
                                style={NavbarStyle.BUTTON}
                            >
                                <div className="user-icon-navbar">
                                    <PersonalIcon
                                        isActive={true}
                                        common={false}
                                        avatar={user?.avatar}
                                        name={user?.name}
                                        color={user?.avatarColor}
                                    />
                                </div>
                            </Button>
                        </Popover>
                    </li>

                    <Link className="link-icon" to="/chat">
                        <li
                            className={`sidebar_nav_item  ${checkCurrentPage('MESSAGE') ? 'active' : ''}`}
                            onClick={() => handleSetTabActive(1)}
                        >
                            <div className="sidebar_nav_item--icon">
                                <Badge
                                    count={toTalUnread > 0 ? toTalUnread : 0}
                                >
                                    <MessageOutlined />
                                </Badge>
                            </div>
                        </li>
                    </Link>

                    <Link className="link-icon" to="/chat/friends">
                        <li
                            className={`sidebar_nav_item  ${checkCurrentPage('FRIEND') ? 'active' : ''}`}
                            onClick={() => handleSetTabActive(2)}
                        >
                            <div className="sidebar_nav_item--icon">
                                <Badge count={amountNotify}>
                                    <ContactsOutlined />
                                </Badge>
                            </div>
                        </li>
                    </Link>
                </ul>

                <ul className="sidebar_nav">
                    <li className="sidebar_nav_item">
                        <div className="sidebar_nav_item--icon">

                            <Popover
                                placement="rightTop"
                                content={setting}
                                trigger="click"
                            >
                                <Button
                                    style={NavbarStyle.BUTTON_SETTING}
                                >

                                    <SettingOutlined />
                                </Button>
                            </Popover>
                        </div>
                    </li>

                </ul>
            </div>


            <ModalUpdateProfile
                open={isModalUpdateProfileVisible}
                onCancel={handleCancelModalUpdateProfile}
                onOk={handleOklModalUpdateProfile}
                loading={confirmLoading}
            />


            <ModalChangePassword
                visible={visibleModalChangePassword}
                onCancel={() => setvisibleModalChangePassword(false)}
                onSaveCodeRevoke={onSaveCodeRevoke}
            />


        </div>
    );
}

export default NavbarContainer;