import {
    ContactsOutlined, LockOutlined,
    LogoutOutlined,
    MessageOutlined,
    SettingOutlined, UserOutlined
} from '@ant-design/icons';
import { Badge, Button, Popover } from 'antd';
import PropTypes from 'prop-types';
import react, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PersonalIcon from '../../components/PersonalIcon';
import './style.css';
import ModalUpdateProfile from '../../../../modals/ModalUpdateProfile';
import DEFAULT_AVATAR from '../../../../assets/images/user.png';
const NavbarContainer = () => {
    const navigate = useLocation();
    const { user, tabActive } = useSelector((state) => state.global);
    const [isModalUpdateProfileVisible, setIsModalUpdateProfileVisible] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);

    const handleCancelModalUpdateProfile = (value) => {
        setIsModalUpdateProfileVisible(value);
    };

    const handleOklModalUpdateProfile = (value) => {
        setConfirmLoading(true);
        setConfirmLoading(false);
        setIsModalUpdateProfileVisible(false);
    };
    const handleUpdateProfile = () => {
        setIsModalUpdateProfileVisible(true);
    };
    const handleLogout = () => {
        console.log('logout');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = 'auth/login';
    };
    console.log('user', user);
    const account = (
        <div className='pop_up-personal'>
            <div className='pop_up-personal--item'>
                <div className='pop_up-personal--item-icon'>
                    <UserOutlined />
                </div>
                <div className="pop_up-personal--item-text" onClick={handleUpdateProfile}>Tài khoản</div>
            </div>
            <div className='pop_up-personal--item'>
                <div className='pop_up-personal--item-icon'>
                    <LockOutlined />
                </div>
                <div className="pop_up-personal--item-text" onClick={handleLogout}>Đăng xuất</div>
            </div>
        </div>
    )
    const setting = (
        <div className='pop_up-personal'>
            <div className='pop_up-personal--item'>
                <div className='pop_up-personal--item-icon'>
                    <LockOutlined />
                </div>
                <div className="pop_up-personal--item-text">Đổi mật khẩu</div>
            </div>
        </div>
    )
    return (
        <div id="sidebar_wrapper">
            <div className="sidebar-main">
                <ul className="sidebar_nav">
                    <li className="sidebar_nav_item icon-avatar">
                        <Popover
                            placement="bottomLeft"
                            content={account}
                            trigger="click"
                            destroyTooltipOnHide={true}
                        >
                            <Button
                                style={{
                                    height: '48px',
                                    width: '48px',
                                    background: 'none',
                                    outline: 'none',
                                    border: 'red',
                                    padding: '0px',
                                    borderRadius: '50%'
                                }}
                            >
                                <div className="user-icon-navbar">
                                    <PersonalIcon
                                        isActive={true}
                                        common={false}
                                        avatar={user?.avatar?user.avatar:DEFAULT_AVATAR}
                                        name={user?.name}
                                        color={user?.avatarColor}
                                    />
                                </div>
                            </Button>
                        </Popover>
                    </li>
                </ul>

                <ul className="sidebar_nav">
                    <li className="sidebar_nav_item">
                        <div className="sidebar_nav_item--icon">

                            <Popover
                                placement="rightTop"
                                content={setting}
                                trigger="focus"
                            >
                                <Button
                                    style={{
                                        height: '100%',
                                        width: '100%',
                                        background: 'none',
                                        outline: 'none',
                                        border: 'red',
                                        padding: '0px',
                                    }}
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
        </div>

    );
};
export default NavbarContainer;