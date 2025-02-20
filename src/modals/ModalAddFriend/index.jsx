import React, { useState } from "react";
import { Modal, Input } from "antd";
import PropTypes from "prop-types";
import "./style.css";

ModalAddFriend.propTypes = {
    isVisible: PropTypes.bool.isRequired,
    onCancel: PropTypes.func,
    onSearch: PropTypes.func,
    onEnter: PropTypes.func,
};



function ModalAddFriend({ isVisible, onCancel = null, onSearch = null, onEnter = null }) {
    const [value, setValue] = useState('');
    const handleOnPressEnter = () => {
        if (onEnter) {
            onEnter(value);
        }
    }
    const handleOk = () => {
        if (onSearch) {
            onSearch(value);
        }
    }
    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
    }
    const handleInputChange = (e) => {
        setValue(e.target.value);
    };

    return (
        <Modal
            title="Thêm bạn bè"
            open={isVisible}
            onOk={handleOk}
            onCancel={handleCancel}
            width={400}
            okText="Tìm kiếm"
            cancelText="Hủy"
            okButtonProps={{ disabled: !(value.trim().length > 0) }}
        >
            <div className="input-add-friend_wrapper">
                <Input placeholder="Nhập số điện thoại hoặc email"
                    allowClear
                    value={value}
                    onChange={handleInputChange}
                    onPressEnter={handleOnPressEnter}
                    className="input-add-friend"
                />
            </div>

        </Modal>
    );
};
export default ModalAddFriend;