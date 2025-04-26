import React, { useState } from "react";
import { Button, Tooltip } from "antd";
import { EditOutlined } from "@ant-design/icons";
import EditImage from "../../screen/Chat/components/EditImage";
import "./style.css";

function FloatButton() {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleEditSuccess = (imageUrl) => {
    console.log("Image edited successfully:", imageUrl);
    // Có thể thêm hành động khác sau khi chỉnh sửa ảnh thành công
    // Ví dụ: Lưu vào state, hiển thị thông báo, v.v.
  };

  return (
    <>
      <div className="float-button-container">
        <Tooltip title="Chỉnh sửa ảnh với AI">
          <Button
            type="primary"
            shape="circle"
            icon={<EditOutlined />}
            size="large"
            className="float-edit-button"
            onClick={showModal}
          />
        </Tooltip>
      </div>

      <EditImage
        visible={isModalVisible}
        onCancel={handleCancel}
        onEditSuccess={handleEditSuccess}
      />
    </>
  );
}

export default FloatButton;
