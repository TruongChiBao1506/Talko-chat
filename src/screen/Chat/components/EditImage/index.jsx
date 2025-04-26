import React, { useState } from "react";
import { Modal, Input, Button, Image, Spin, message } from "antd";
import { FileImageOutlined, EditOutlined } from "@ant-design/icons";
import PropTypes from "prop-types";
import mediaApi from "../../../../apis/mediaApi";
import "./style.css";

EditImage.propTypes = {
  visible: PropTypes.bool,
  onCancel: PropTypes.func,
  onEditSuccess: PropTypes.func,
};

EditImage.defaultProps = {
  visible: false,
  onCancel: () => {},
  onEditSuccess: () => {},
};

function EditImage(props) {
  const { visible, onCancel, onEditSuccess } = props;
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [promptText, setPromptText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [resultText, setResultText] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
      setResultImage(null);
      setResultText("");
    }
  };

  const handlePromptChange = (e) => {
    setPromptText(e.target.value);
  };

  const handleEditImage = async () => {
    if (!selectedImage) {
      message.error("Vui lòng chọn một hình ảnh để chỉnh sửa");
      return;
    }

    if (!promptText.trim()) {
      message.error("Vui lòng nhập mô tả chỉnh sửa");
      return;
    }

    setLoading(true);
    try {
      const response = await mediaApi.editImage(selectedImage, promptText);
      if (response.success) {
        setResultImage(response.data.imageUrl);
        setResultText(response.data.text || "");
        message.success("Chỉnh sửa ảnh thành công");
      } else {
        message.error("Có lỗi xảy ra khi chỉnh sửa ảnh");
      }
    } catch (error) {
      console.error("Error editing image:", error);
      message.error("Có lỗi xảy ra khi chỉnh sửa ảnh");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = () => {
    if (resultImage) {
      onEditSuccess(resultImage);
      handleCloseModal();
    }
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
    setPreviewImage(null);
    setPromptText("");
    setResultImage(null);
    setResultText("");
    onCancel();
  };

  return (
    <Modal
      title={
        <div className="edit-image-title">
          <EditOutlined /> Chỉnh sửa ảnh với AI
        </div>
      }
      open={visible}
      onCancel={handleCloseModal}
      width={800}
      footer={null}
      className="edit-image-modal"
    >
      <div className="edit-image-container">
        <div className="edit-image-input-section">
          <div className="edit-image-upload">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleImageChange}
              className="edit-image-file-input"
            />
            <label htmlFor="image-upload" className="edit-image-upload-button">
              <FileImageOutlined /> Chọn ảnh
            </label>
            {previewImage && (
              <div className="edit-image-preview">
                <Image
                  src={previewImage}
                  alt="Preview"
                  className="edit-image-preview-img"
                />
              </div>
            )}
          </div>

          <div className="edit-image-prompt">
            <Input.TextArea
              placeholder="Nhập mô tả chỉnh sửa (VD: Xóa nền, thêm hiệu ứng mưa, thay đổi màu sắc...)"
              value={promptText}
              onChange={handlePromptChange}
              rows={4}
              className="edit-image-prompt-input"
            />
          </div>

          <Button
            type="primary"
            onClick={handleEditImage}
            className="edit-image-button"
            disabled={!selectedImage || !promptText.trim() || loading}
          >
            {loading ? "Đang xử lý..." : "Chỉnh sửa ảnh"}
          </Button>
        </div>

        {loading ? (
          <div className="edit-image-loading">
            <Spin size="large" />
            <p>Đang xử lý ảnh với AI...</p>
          </div>
        ) : (
          resultImage && (
            <div className="edit-image-result">
              <h3>Kết quả chỉnh sửa:</h3>
              <div className="edit-image-result-img">
                <Image
                  src={resultImage}
                  alt="Edited"
                  className="edit-image-edited"
                />
              </div>
              {resultText && (
                <div className="edit-image-result-text">
                  <p>{resultText}</p>
                </div>
              )}
              <div className="edit-image-actions">
                <Button
                  type="primary"
                  onClick={handleSaveEdit}
                  className="edit-image-save-button"
                >
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </Modal>
  );
}

export default EditImage;
