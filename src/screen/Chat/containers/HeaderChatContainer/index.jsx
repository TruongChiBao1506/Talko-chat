import React, { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import "./style.css";
import { useSelector } from 'react-redux';
import HeaderOptional from '../../components/HeaderOptional';

HeaderChatContainer.propTypes = {
    onPopUpInfo: PropTypes.func,
    onOpenDrawer: PropTypes.func,
    onStartCall: PropTypes.func,
    onStartVideoCall: PropTypes.func,
    isFriend: PropTypes.bool,
    userId: PropTypes.string,
};

function HeaderChatContainer({ onPopUpInfo = null, onOpenDrawer = null, onStartCall = null, onStartVideoCall = null, isFriend = false, userId = null }) {
    const [detailConver, setDetailConver] = useState({})
    const { currentConversation, conversations, memberInConversation } = useSelector(
        (state) => state.chat
    );
    useEffect(() => {

        if (currentConversation) {
            const tempConver = conversations.find(
                (conver) => conver._id === currentConversation
            );
            if (tempConver) {
                setDetailConver(tempConver);
            }
        }
    }, [currentConversation, conversations]);

    return (
        <div id='header-main'>
            <HeaderOptional
                avatar={detailConver.avatar}
                totalMembers={memberInConversation.length}
                name={detailConver.name}
                typeConver={detailConver.type}
                isLogin={detailConver?.isOnline}
                lastLogin={detailConver?.lastLogin} 
                avatarColor={detailConver?.avatarColor}
                onPopUpInfo={onPopUpInfo}
                onOpenDrawer={onOpenDrawer}
                memberInConversation={memberInConversation} // Truyền thêm danh sách thành viên
                onStartCall={onStartCall} // Truyền hàm xử lý cuộc gọi
                onStartVideoCall={onStartVideoCall} // Truyền hàm xử lý cuộc gọi video
                isFriend={isFriend} // Truyền trạng thái bạn bè
                userId={userId} // Truyền ID người dùng
            />
        </div>
    );
}
export default HeaderChatContainer;