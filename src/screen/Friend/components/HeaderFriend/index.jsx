import React from 'react';
import PropTypes from 'prop-types';
import ICON_FRIEND from '../../../../assets/images/icon_friend.png';
import ICON_GROUP from '../../../../assets/images/icon_group.png';
import ICON_CONTACT from '../../../../assets/images/contacts_icon.png';
import './style.css';
import { LeftOutlined } from '@ant-design/icons';


HeaderFriend.propTypes = {
    subtab: PropTypes.number,
    onBack: PropTypes.func,
};

function HeaderFriend({ subtab=0, onBack=null }) {

    const handleOnClick = () => {
        if (onBack) {
            onBack();
        }
    }


    return (
        <div id='header_friend'>
            <div className='icon-header back-list' onClick={handleOnClick}>
                <LeftOutlined />
            </div>
            <div className="header_friend__img">
                {subtab === 0 && (
                    <img
                        src={ICON_FRIEND}
                        alt="thumbnail"
                    />
                )}

                {subtab === 1 && (
                    <img
                        src={ICON_GROUP}
                        alt="thumbnail"
                    />
                )}

                {subtab === 2 && (
                    <img
                        src={ICON_CONTACT}
                        alt="thumbnail"
                    />
                )}
            </div>

            <div className="header_friend__text">
                {subtab === 0 && "Danh sách kết bạn"}
                {subtab === 1 && "Danh sách nhóm"}
                {subtab === 2 && "Danh bạ"}
            </div>
        </div>
    );
}

export default HeaderFriend;