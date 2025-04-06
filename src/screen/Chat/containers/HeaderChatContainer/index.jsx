import React, { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import "./style.css";
import { useSelector } from 'react-redux';
import HeaderOptional from '../../components/HeaderOptional';

HeaderChatContainer.propTypes = {
    onPopUpInfo: PropTypes.func,
    onOpenDrawer: PropTypes.func,
};

function HeaderChatContainer({ onPopUpInfo = null, onOpenDrawer = null}) {

    const [detailConver, setDetailConver] = useState({})
    const { currentConversation, conversations, memberInConversation } = useSelector(
        (state) => state.chat
    );

    useEffect(() => {
        console.log("currentConversation", currentConversation);
        
        if (currentConversation) {
            const tempConver = conversations.find(
                (conver) => conver._id === currentConversation
            );
            if (tempConver) {
                setDetailConver(tempConver);
            }
        }
    }, [currentConversation, conversations])


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
            />
        </div>
    );
}
export default HeaderChatContainer;