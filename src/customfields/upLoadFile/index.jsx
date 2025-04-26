import { message, Upload, Modal, Button, Input, Spin, Image } from "antd";
import { EditOutlined } from "@ant-design/icons";
import messageApi from "../../apis/messageApi";
import mediaApi from "../../apis/mediaApi";
import ACCEPT_FILE from "../../constants/acceptFile";
import PropTypes from "prop-types";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import axiosClient from "../../apis/axiosClient";

UploadFile.propTypes = {
  typeOfFile: PropTypes.string,
};

UploadFile.defaultProp = {
  typeOfFile: "",
};

function UploadFile(props) {
  const { typeOfFile } = props;
  const { currentConversation, currentChannel } = useSelector(
    (state) => state.chat
  );
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState(null);
  const [promptText, setPromptText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [resultText, setResultText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const getProxyImageUrl = (originalUrl) => {
    const baseURL = axiosClient.defaults.baseURL || "";
    return `${baseURL}/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  };

  const handleCustomRequest = async ({ file }) => {
    if (typeOfFile === "media" && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setSelectedFileUrl(URL.createObjectURL(file));
      setIsEditModalVisible(true);
      return;
    }

    await sendFileMessage(file);
  };

  const sendFileMessage = async (file) => {
    const fmData = new FormData();
    let typeFile;

    if (typeOfFile === "media") {
      typeFile = file.type.startsWith("image") ? "IMAGE" : "VIDEO";
    } else {
      typeFile = "FILE";
    }
    fmData.append("file", file);

    const attachInfo = {
      type: typeFile,
      conversationId: currentConversation,
    };

    if (currentChannel) {
      attachInfo.channelId = currentChannel;
    }

    try {
      await messageApi.sendFileThroughMessage(
        fmData,
        attachInfo,
        (percentCompleted) => {
          console.log("Upload progress", percentCompleted);
        }
      );
      message.success(`Đã tải lên ${file.name}`);
    } catch (e) {
      message.error(`Tải lên ${file.name} thất bại.`);
    }
  };

  const handleCloseModal = () => {
    setIsEditModalVisible(false);
    setPromptText("");
    setResultImage(null);
    setResultText("");
    setSelectedFile(null);
    setSelectedFileUrl(null);
  };

  const handlePromptChange = (e) => {
    setPromptText(e.target.value);
  };

  const handleSendOriginal = async () => {
    if (selectedFile) {
      await sendFileMessage(selectedFile);
      handleCloseModal();
    }
  };

  const handleEditImage = async () => {
    if (!selectedFile) {
      message.error("Không tìm thấy ảnh để chỉnh sửa");
      return;
    }

    if (!promptText.trim()) {
      message.error("Vui lòng nhập mô tả chỉnh sửa");
      return;
    }

    setLoading(true);
    try {
      const editResponse = await mediaApi.editImage(selectedFile, promptText);
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

  const handleSendEditedImage = async () => {
    if (!resultImage) {
      message.error("Không có ảnh đã chỉnh sửa để gửi");
      return;
    }

    setSavingEdit(true);
    try {
      let imageUrl = resultImage;
      
      // Kiểm tra nếu URL là từ Amazon S3 hoặc một nguồn cần proxy
      const needsProxy = resultImage.includes('amazonaws.com') || resultImage.includes('http');
      
      if (needsProxy) {
        // Sử dụng proxy URL để tránh lỗi CORS
        const proxyUrl = getProxyImageUrl(resultImage);
        
        // Gọi API proxy để tải ảnh
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`Không thể tải ảnh đã chỉnh sửa: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const editedFile = new File([blob], `edited-${selectedFile.name}`, {
          type: selectedFile.type,
        });
        
        await sendFileMessage(editedFile);
      } else {
        // Nếu URL là dạng base64 hoặc blob URL trong trình duyệt, xử lý trực tiếp
        try {
          const response = await fetch(resultImage);
          if (!response.ok) {
            throw new Error("Không thể tải ảnh đã chỉnh sửa");
          }
          
          const blob = await response.blob();
          const editedFile = new File([blob], `edited-${selectedFile.name}`, {
            type: selectedFile.type,
          });
          
          await sendFileMessage(editedFile);
        } catch (fetchError) {
          console.error("Failed to fetch edited image directly:", fetchError);
          
          // Thử tải ảnh bằng cách tạo thẻ Image
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(async (blob) => {
              if (blob) {
                const file = new File([blob], `edited-${selectedFile.name}`, {
                  type: selectedFile.type || 'image/png',
                });
                
                await sendFileMessage(file);
                handleCloseModal();
                message.success("Đã gửi ảnh đã chỉnh sửa");
                setSavingEdit(false);
              } else {
                throw new Error("Không thể chuyển đổi ảnh");
              }
            }, selectedFile.type || 'image/png');
          };
          
          img.onerror = (error) => {
            console.error("Error loading image:", error);
            throw new Error("Không thể tải ảnh");
          };
          
          img.src = resultImage;
          return; // Trả về để tránh đóng modal hai lần
        }
      }
      
      handleCloseModal();
      message.success("Đã gửi ảnh đã chỉnh sửa");
    } catch (error) {
      console.error("Error sending edited image:", error);
      message.error(`Lỗi khi gửi ảnh đã chỉnh sửa: ${error.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const renderImage = (url) => {
    if (!url) return null;
    return (
      <Image
        src={url}
        alt="Preview"
        style={{ maxWidth: "100%", maxHeight: "300px" }}
        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3PTWBSGcbGzM6GCKqlIBRV0dHRJFarQ0eUT8LH4BnRU0NHR0UEFVdIlFRV7TzRksomPY8uykTk/zewQfKw/9znv4yvJynLv4uLiV2dBoDiBf4qP3/ARuCRABEFAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEg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"
      />
    );
  };

  return (
    <>
      <Upload
        accept={
          typeOfFile === "media" ? ACCEPT_FILE.IMAGE_VIDEO : ACCEPT_FILE.FILE
        }
        multiple={true}
        progress
        customRequest={handleCustomRequest}
        showUploadList={false}
      >
        {props.children}
      </Upload>

      <Modal
        title={
          <div className="edit-image-modal-title">
            <EditOutlined /> Chỉnh sửa ảnh với AI trước khi gửi
          </div>
        }
        open={isEditModalVisible}
        onCancel={handleCloseModal}
        width={800}
        footer={null}
        className="edit-image-modal"
      >
        <div style={{ padding: "10px" }}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "300px" }}>
                <h3>Ảnh gốc:</h3>
                <div style={{ marginBottom: "10px" }}>
                  {renderImage(selectedFileUrl)}
                </div>
                <Button
                  type="default"
                  onClick={handleSendOriginal}
                  style={{ marginTop: "10px" }}
                >
                  Gửi ảnh gốc
                </Button>
              </div>

              <div style={{ flex: 1, minWidth: "300px" }}>
                <h3>Mô tả chỉnh sửa:</h3>
                <Input.TextArea
                  placeholder="Nhập mô tả chỉnh sửa (VD: Xóa nền, thêm hiệu ứng mưa, thay đổi màu sắc...)"
                  value={promptText}
                  onChange={handlePromptChange}
                  rows={4}
                  style={{ marginBottom: "10px" }}
                />
                <Button
                  type="primary"
                  onClick={handleEditImage}
                  disabled={!selectedFileUrl || !promptText.trim() || loading}
                  style={{ marginTop: "10px" }}
                >
                  {loading ? "Đang xử lý..." : "Chỉnh sửa ảnh"}
                </Button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <Spin size="large" />
                <p>Đang xử lý ảnh với AI...</p>
              </div>
            ) : (
              resultImage && (
                <div style={{ marginTop: "20px" }}>
                  <h3>Kết quả chỉnh sửa:</h3>
                  <div style={{ marginBottom: "10px" }}>
                    {renderImage(resultImage)}
                  </div>
                  {resultText && (
                    <div style={{ marginTop: "10px" }}>
                      <p>{resultText}</p>
                    </div>
                  )}
                  <Button
                    type="primary"
                    onClick={handleSendEditedImage}
                    loading={savingEdit}
                    style={{ marginTop: "10px" }}
                  >
                    {savingEdit ? "Đang gửi..." : "Gửi ảnh đã chỉnh sửa"}
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

export default UploadFile;
