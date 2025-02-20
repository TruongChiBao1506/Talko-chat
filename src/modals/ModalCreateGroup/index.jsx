import React, { useState } from "react";
import { EditOutlined, InfoCircleFilled, SearchOutlined } from '@ant-design/icons';
import { Checkbox, Col, Divider, Input, Modal, Row } from 'antd';
import Text from 'antd/lib/typography/Text';
import PropTypes, { element } from 'prop-types';
import ItemsSelected from '../../screen/Chat/components/ItemsSelected';
import PersonalIcon from "../../screen/Chat/components/PersonalIcon";
import DEFAULT_AVATAR from '../../assets/images/user.png';
ModalCreateGroup.propTypes = {
    isVisible: PropTypes.bool,
    onCancel: PropTypes.func,
    onOk: PropTypes.func,
    loading: PropTypes.bool,
};
function ModalCreateGroup({ isVisible = false, onCancel = null, onOk = null, loading = false }) {
    const [checkList, setCheckList] = useState([]);
    const [itemSelected, setItemSelected] = useState([]);
    const [nameGroup, setNameGroup] = useState('');
    const [isShowError, setIsShowError] = useState(false);
    const [frInput, setFrInput] = useState('');
    const [initalFriend, setInitalFriend] = useState([]);

    const handleCancel = () => {
        if (onCancel) {
            onCancel()
        }
    };
    const handleChange = (e) => {
        const value = e.target.value;
        setNameGroup(value);
    }
    const handleOnBlur = (e) => {
        !nameGroup.length > 0 ? setIsShowError(true) : setIsShowError(false);
    }
    return (
        <Modal
            title="tạo nhóm"
            open={isVisible}
            centered
            okText="Tạo nhóm"
            cancelText="Hủy"
            onCancel={handleCancel}
            okButtonProps={{ disabled: !(itemSelected.length > 0 && nameGroup.length > 0) }}
            confirmLoading={loading}>
            <div id="modal-create-group">
                <div className="heading-group">
                    <div className="select-background">
                        <EditOutlined />
                    </div>

                    <div className="input-name-group">
                        <Input
                            size="middle"
                            placeholder="Nhập tên nhóm"
                            style={{ width: '100%' }}
                            value={nameGroup}
                            onChange={handleChange}
                            onBlur={handleOnBlur} />
                        {isShowError && <Text type="danger"><InfoCircleFilled /> Tên nhóm không được để trống</Text>}
                    </div>


                </div>
                <Divider orientation="left" plain><span className='divider-title'>Thêm bạn vào nhóm</span></Divider>
                <div className="search-friend-input">
                    <Input
                        size="middle"
                        placeholder="Nhập tên"
                        style={{ width: '100%' }}
                        prefix={<SearchOutlined />}
                        onChange={() => { }}
                        value={frInput}
                    />
                </div>
                <Divider />
                <div className="list-friend-interact">
                    <div className={`list-friend-interact--left ${itemSelected.length > 0 ? '' : 'full-container'}`}>
                        <div className="title-list-friend">
                            <span>Danh sách bạn bè</span>
                        </div>

                        <div className="checkbox-list-friend">
                            <Checkbox.Group style={{ width: '100%' }} value={checkList}>
                                <Row gutter={[0, 12]}>
                                    {initalFriend.map((element, index) => (
                                        <Col span={24} key={index}>
                                            <Checkbox value={element._id} onChange={() => { }}>
                                                <div className="item-checkbox">
                                                    <PersonalIcon
                                                        demention={36}
                                                        avatar={element.avatar ? element.avatar : DEFAULT_AVATAR}
                                                        name={element.name}
                                                        color={element.avatarColor}
                                                    />
                                                    <span className='item-name'>{element.name}</span>
                                                </div>
                                            </Checkbox>
                                        </Col>
                                    ))}
                                </Row>
                            </Checkbox.Group>
                        </div>
                    </div>
                    <div className={`list-friend-interact--right ${itemSelected.length > 0 ? '' : 'close'}`}>
                        <div className="title-list-friend-checked">
                            <strong>Đã chọn: {itemSelected.length > 0 && itemSelected.length}</strong>
                        </div>

                        <div className="checkbox-list-friend">
                            <ItemsSelected
                                items={itemSelected}
                                onRemove={()=>{}}
                            />

                        </div>
                    </div>

                </div>

            </div>

        </Modal>
    )
}

export default ModalCreateGroup;