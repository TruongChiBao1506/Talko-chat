import { TagFilled } from '@ant-design/icons';
import {Menu } from 'antd';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import ClassifyApi from '../../apis/classifyApi';
import ModalClassify from '../../modals/ModalClassify';
import {fetchListClassify} from '../../screen/Chat/slices/chatSlice'
import { useDispatch } from 'react-redux';

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
