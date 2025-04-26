import React, { useState } from "react";
import { Modal, Input, Button, Image, Spin, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import PropTypes from "prop-types";
import mediaApi from "../../apis/mediaApi";
import axiosClient from "../../apis/axiosClient";
import "./style.css";

EditImageModal.propTypes = {
  visible: PropTypes.bool,
  imageUrl: PropTypes.string,
  onCancel: PropTypes.func,
  onSuccess: PropTypes.func,
};

EditImageModal.defaultProps = {
  visible: false,
  imageUrl: "",
  onCancel: () => {},
  onSuccess: () => {},
};

function EditImageModal(props) {
  const { visible, imageUrl, onCancel, onSuccess } = props;
  const [promptText, setPromptText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [resultText, setResultText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handlePromptChange = (e) => {
    setPromptText(e.target.value);
  };

  // Hàm để lấy proxy URL cho ảnh từ S3
  const getProxyImageUrl = (originalUrl) => {
    // Lấy URL gốc từ axiosClient
    const baseURL = axiosClient.defaults.baseURL || "";
    return `${baseURL}/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  };

  const handleEditImage = async () => {
    if (!imageUrl) {
      message.error("Không tìm thấy ảnh để chỉnh sửa");
      return;
    }

    if (!promptText.trim()) {
      message.error("Vui lòng nhập mô tả chỉnh sửa");
      return;
    }

    setLoading(true);
    try {
      // Sử dụng proxy để tải ảnh, tránh lỗi CORS
      const proxyUrl = getProxyImageUrl(imageUrl);

      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const file = new File([blob], "image-to-edit.jpg", {
        type: blob.type || "image/jpeg",
      });

      // Gửi yêu cầu chỉnh sửa
      const editResponse = await mediaApi.editImage(file, promptText);
      if (editResponse.success) {
        setResultImage(editResponse.data.imageUrl);
        setResultText(editResponse.data.text || "");
        message.success("Chỉnh sửa ảnh thành công");
      } else {
        message.error("Có lỗi xảy ra khi chỉnh sửa ảnh");
      }
    } catch (error) {
      console.error("Error editing image:", error);
      message.error(`Có lỗi xảy ra khi chỉnh sửa ảnh: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!resultImage) {
      message.error("Không có ảnh để lưu");
      return;
    }

    try {
      setSavingEdit(true);

      // Gọi callback để cập nhật hình ảnh và lưu vào cơ sở dữ liệu
      await onSuccess(resultImage);

      // Thông báo thành công
      message.success(
        "Ảnh đã được cập nhật thành công và sẽ hiển thị trong cuộc trò chuyện"
      );

      // Đóng modal
      handleCloseModal();
    } catch (error) {
      console.error("Error saving edited image:", error);
      message.error(
        `Lỗi khi lưu ảnh đã chỉnh sửa: ${error.message || "Vui lòng thử lại"}`
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCloseModal = () => {
    setPromptText("");
    setResultImage(null);
    setResultText("");
    onCancel();
  };

  // Xử lý hiển thị ảnh an toàn
  const renderImage = (url) => {
    if (!url) return null;

    // Xác định xem URL có phải là S3 URL hay không
    const isS3Url = url.includes("amazonaws.com");
    const displayUrl = isS3Url ? getProxyImageUrl(url) : url;

    return (
      <Image
        src={displayUrl}
        alt={isS3Url ? "S3 Image (Proxied)" : "Image"}
        className="edit-image-modal-img"
        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3PTWBSGcbGzM6GCKqlIBRV0dHRJFarQ0eUT8LH4BnRU0NHR0UEFVdIlFRV7TzRksomPY8uykTk/zewQfKw/9znv4yvJynLv4uLiV2dBoDiBf4qP3/ARuCRABEFAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghgg0Aj8i0JO4OzsrPv69Wv+hi2qPHr0qNvf39+iI97soRIh4f3z58/u7du3SXX7Xt7Z2enevHmzfQe+oSN2apSAPj09TSrb+XKI/f379+08+A0cNRE2ANkupk+ACNPvkSPcAAEibACyXUyfABGm3yNHuAECRNgAZLuYPgEirKlHu7u7XdyytGwHAd8jjNyng4OD7vnz51dbPT8/7z58+NB9+/bt6jU/TI+AGWHEnrx48eJ/EsSmHzx40L18+fLyzxF3ZVMjEyDCiEDjMYZZS5wiPXnyZFbJaxMhQIQRGzHvWR7XCyOCXsOmiDAi1HmPMMQjDpbpEiDCiL358eNHurW/5SnWdIBbXiDCiA38/Pnzrce2YyZ4//59F3ePLNMl4PbpiL2J0L979+7yDtHDhw8vtzzvdGnEXdvUigSIsCLAWavHp/+qM0BcXMd/q25n1vF57TYBp0a3mUzilePj4+7k5KSLb6gt6ydAhPUzXnoPR0dHl79WGTNCfBnn1uvSCJdegQhLI1vvCk+fPu2ePXt2tZOYEV6/fn31dz+shwAR1sP1cqvLntbEN9MxA9xcYjsxS1jWR4AIa2Ibzx0tc44fYX/16lV6NDFLXH+YL32jwiACRBiEbf5KcXoTIsQSpzXx4N28Ja4BQoK7rgXiydbHjx/P25TaQAJEGAguWy0+2Q8PD6/Ki4R8EVl+bzBOnZY95fq9rj9zAkTI2SxdidBHqG9+skdw43borCXO/ZcJdraPWdv22uIEiLA4q7nvvCug8WTqzQveOH26fodo7g6uFe/a17W3+nFBAkRYENRdb1vkkz1CH9cPsVy/jrhr27PqMYvENYNlHAIesRiBYwRy0V+8iXP8+/fvX11Mr7L7ECueb/r48eMqm7FuI2BGWDEG8cm+7G3NEOfmdcTQw4h9/55lhm7DekRYKQPZF2ArbXTAyu4kDYB2YxUzwg0gi/41ztHnfQG26HbGel/crVrm7tNY+/1btkOEAZ2M05r4FB7r9GbAIdxaZYrHdOsgJ/wCEQY0J74TmOKnbxxT9n3FgGGWWsVdowHtjt9Nnvf7yQM2aZU/TIAIAxrw6dOnAWtZZcoEnBpNuTuObWMEiLAx1HY0ZQJEmHJ3HNvGCBBhY6jtaMoEiJB0Z29vL6ls58vxPcO8/zfrdo5qvKO+d3Fx8Wu8zf1dW4p/cPzLly/dtv9Ts/EbcvGAHhHyfBIhZ6NSiIBTo0LNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiEC/wGgKKC4YMA4TAAAAABJRU5ErkJggg=="
      />
    );
  };

  return (
    <Modal
      title={
        <div className="edit-image-modal-title">
          <EditOutlined /> Chỉnh sửa ảnh với AI
        </div>
      }
      open={visible}
      onCancel={handleCloseModal}
      width={800}
      footer={null}
      className="edit-image-modal"
    >
      <div className="edit-image-modal-container">
        <div className="edit-image-modal-input-section">
          <div className="edit-image-modal-original">
            <h3>Ảnh gốc:</h3>
            <div className="edit-image-modal-preview">
              {renderImage(imageUrl)}
            </div>
          </div>

          <div className="edit-image-modal-prompt">
            <h3>Mô tả chỉnh sửa:</h3>
            <Input.TextArea
              placeholder="Nhập mô tả chỉnh sửa (VD: Xóa nền, thêm hiệu ứng mưa, thay đổi màu sắc...)"
              value={promptText}
              onChange={handlePromptChange}
              rows={4}
              className="edit-image-modal-prompt-input"
            />
          </div>

          <Button
            type="primary"
            onClick={handleEditImage}
            className="edit-image-modal-button"
            disabled={!imageUrl || !promptText.trim() || loading}
          >
            {loading ? "Đang xử lý..." : "Chỉnh sửa ảnh"}
          </Button>
        </div>

        {loading ? (
          <div className="edit-image-modal-loading">
            <Spin size="large" />
            <p>Đang xử lý ảnh với AI...</p>
          </div>
        ) : (
          resultImage && (
            <div className="edit-image-modal-result">
              <h3>Kết quả chỉnh sửa:</h3>
              <div className="edit-image-modal-result-img">
                {renderImage(resultImage)}
              </div>
              {resultText && (
                <div className="edit-image-modal-result-text">
                  <p>{resultText}</p>
                </div>
              )}
              <div className="edit-image-modal-actions">
                <Button
                  type="primary"
                  onClick={handleSaveEdit}
                  loading={savingEdit}
                  className="edit-image-modal-save-button"
                >
                  {savingEdit ? "Đang lưu..." : "Gửi ảnh đã chỉnh sửa"}
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </Modal>
  );
}

export default EditImageModal;
