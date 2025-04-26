import { CheckCircleFilled, ShareAltOutlined } from "@ant-design/icons";
import { Image } from "antd";
import PropTypes from "prop-types";
import React, { useState } from "react";
import IMAGE_ITEM_STYLE from "./ImageItemStyle";
import OverlayImage from "../../../../components/OverlayImage";
import { fallback } from "../../../../constants/images";
import EditImageModal from "../../../../modals/EditImageModal";
import "./style.css";

ImageItem.propTypes = {
  url: PropTypes.string,
  height: PropTypes.number,
  width: PropTypes.number,
  type: PropTypes.string,
  onVisibleVideoModal: PropTypes.func,
  onImageEditSuccess: PropTypes.func,
};

ImageItem.defaultProps = {
  url: "https://kenh14cdn.com/thumb_w/660/2020/7/23/h2-1595477334052655614583.jpg",
  height: 110,
  width: 110,
  type: "image",
  onVisibleVideoModal: null,
  onImageEditSuccess: null,
};

function ImageItem(props) {
  const { url, height, width, type, onVisibleVideoModal, onImageEditSuccess } =
    props;
  const [select, setSelect] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [currentUrl, setCurrentUrl] = useState(url);

  const dementionStyle = {
    width: width,
    height: height,
  };

  const selectStyle = {
    color: "#4c92ff",
  };

  // Thêm tham số timestamp để chống cache
  const getImageUrlWithTimestamp = (imageUrl) => {
    if (!imageUrl) return fallback;
    // Kiểm tra nếu URL đã có tham số query
    const separator = imageUrl.includes("?") ? "&" : "?";
    return `${imageUrl}${separator}_t=${imageTimestamp}`;
  };

  const handleShareImage = () => {};

  const handleSelectImage = () => {
    setSelect(!select);
  };

  const handleOnClick = () => {
    if (type === "video" && onVisibleVideoModal) {
      onVisibleVideoModal(currentUrl);
    }
  };

  const handleEdit = (e) => {
    if (e) {
      e.stopPropagation();
    }
    setIsEditModalVisible(true);
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
  };

  const handleEditSuccess = (editedImageUrl) => {
    // Cập nhật URL mới và tạo timestamp mới để buộc tải lại hình ảnh
    setCurrentUrl(editedImageUrl);
    setImageTimestamp(Date.now());

    if (onImageEditSuccess) {
      onImageEditSuccess(url, editedImageUrl);
    }
    setIsEditModalVisible(false);
  };

  return (
    <>
      <div className="item-img-wrapper" onClick={handleOnClick}>
        <div id="item-img" style={dementionStyle}>
          <Image
            style={IMAGE_ITEM_STYLE.IMAGE}
            src={getImageUrlWithTimestamp(currentUrl)}
            fallback={fallback}
            width={width}
            height={height}
            preview={{
              mask: (
                <OverlayImage onEdit={type === "image" ? handleEdit : null} />
              ),
            }}
          />
        </div>
      </div>

      <EditImageModal
        visible={isEditModalVisible}
        imageUrl={currentUrl}
        onCancel={handleEditCancel}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}

export default ImageItem;
