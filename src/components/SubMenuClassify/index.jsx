import { TagFilled, ExclamationCircleOutlined } from '@ant-design/icons';
import {Menu, message, Modal } from 'antd';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import ClassifyApi from '../../apis/classifyApi';
import ModalClassify from '../../modals/ModalClassify';
import {fetchListClassify, fetchListMessages} from '../../screen/Chat/slices/chatSlice'
import { useDispatch } from 'react-redux';
import conversationApi from '../../apis/conversationApi';

SubMenuClassify.propTypes = {
    data: PropTypes.array,
};

SubMenuClassify.defaultProps = {
    data: []
};

function SubMenuClassify({ data, idConver }) {
    const [visible, setVisible] = useState(false);
    const dispatch = useDispatch();

    const handleClickClassify = async (id) => {
        await ClassifyApi.addClassifyForConversation(id, idConver);
        dispatch(fetchListClassify());
    }

    const handleDeleteConversation = async (id) => {
        const { confirm } = Modal;
        confirm({
            title: "Xóa hội thoại",
            icon: <ExclamationCircleOutlined />,
            content: "Bạn có chắc chắn muốn xóa hội thoại này không?",
            okText: "Có",
            cancelText: "Không",
            onOk: async () => {
                await conversationApi.deleteAllMessage(idConver);
                message.success("Xóa hội thoại thành công");
                window.location.reload();
            },
        });
    }

    const items = [
        {
          key: "sub-1",
          label: <span className="menu-item--highlight">Phân loại</span>,
          children: [
            ...data.map((ele) => ({
              key: ele._id,
              icon: <TagFilled style={{ color: `${ele.color.code}` }} />,
              label: ele.name,
              onClick: () => handleClickClassify(ele._id),
            })),
            {
              type: "divider",
            },
            {
              key: "0",
              icon: <TagFilled />,
              label: <span className="menu-item--highlight">Quản lý thẻ phân loại</span>,
              onClick: () => setVisible(true),
            },
          ],
        },
        {
          key: "sub-2",
          label: <span className="menu-item--highlight" style={{color:'red'}}>Xóa hội thoại</span>,
          onClick: () => {
            handleDeleteConversation(idConver);
          },

        }
      ];
    return (
        <>
        <Menu mode="vertical" items={items}/>
        <ModalClassify
          isVisible={visible}
          onCancel={() => setVisible(false)}
          onOpen={() => setVisible(true)}
        />
      </>
    );
}

export default SubMenuClassify;
