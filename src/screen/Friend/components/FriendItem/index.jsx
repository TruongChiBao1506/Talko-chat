import React from 'react';
import PropTypes from 'prop-types';
import { DashOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import PersonalIcon from '../../../Chat/components/PersonalIcon';
import { Menu, Dropdown, Button } from 'antd';
import conversationApi from '../../../../apis/conversationApi';
import { fetchListMessages, setConversations, setCurrentConversation } from '../../../Chat/slices/chatSlice';
import { useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import dateUtils from '../../../../utils/dateUtils';
import './style.css';

FriendItem.propTypes = {
    data: PropTypes.object.isRequired,
    onClickMenu: PropTypes.func,
};


function FriendItem({ data, onClickMenu = null }) {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleClickMenu = ({ key }) => {
        if (onClickMenu) {
            onClickMenu(key, data._id);
        }
    }

    const handleClickFriendItem = async () => {
        const response = await conversationApi.createConversationIndividual(data._id);
        const { _id, isExists } = response;

        if (!isExists) {
            const conver = await conversationApi.getConversationById(data._id);
            dispatch(setConversations(conver));
        }

        dispatch(fetchListMessages({ conversationId: _id, size: 10 }));
        dispatch(setCurrentConversation(_id));

        navigate('/chat');
    }

    const menu = (
        <Menu onClick={handleClickMenu}>
            <Menu.Item key="1" icon={<InfoCircleOutlined />}>
                <span className='menu-item--highlight'>Xem thông tin</span>
            </Menu.Item>
            <Menu.Item key="2" danger icon={<DeleteOutlined />}>
                <span className='menu-item--highlight'>Xóa bạn</span>
            </Menu.Item>
        </Menu>
    );


    return (

        <Dropdown overlay={menu} trigger={['contextMenu']}>
            <div id='friend-item' >
                <div className="friend-item_left" onClick={handleClickFriendItem}>
                    <div className="friend-item-avatar">
                        <PersonalIcon
                            isActive={data.isOnline && data.isOnline}
                            avatar={data.avatar}
                            name={data.name}
                            color={data.avatarColor}
                        />
                    </div>

                    <div className="friend-item-name">
                        {data.name}

                        {data.lastLogin && (
                            <div className="recent-login">
                                {`Truy cập ${dateUtils.toTime(data.lastLogin)} trước`}
                            </div>
                        )}
                    </div>


                </div>
                <div className="friend-item_right">
                    <div className="friend-item-interact">
                        <Dropdown overlay={menu} trigger={['click']}>
                            <Button
                                type='text'
                                icon={<DashOutlined />}
                                style={{ background: 'eeeff2' }}
                            />

                        </Dropdown>


                    </div>
                </div>


            </div>
        </Dropdown>

    );
}

export default FriendItem;