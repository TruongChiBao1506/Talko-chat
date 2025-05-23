import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Image, message as antdMessage } from "antd";
import { useSelector } from "react-redux";
import { fallback } from "../../../../../assets/fallbackImage";
import MESSAGE_STYLE from "../../../../../constants/messageStyle";
import OverlayImage from "../../../../../components/OverlayImage";
import EditImageModal from "../../../../../modals/EditImageModal";
import messageApi from "../../../../../apis/messageApi";
ImageMessage.propTypes = {
    content: PropTypes.string,
    dateAt: PropTypes.object,
    isSeen: PropTypes.bool,
    messageId: PropTypes.string,
    conversationId: PropTypes.string,
};

// 
function ImageMessage({
    content = "",
    children,
    dateAt = null,
    isSeen = false,
    messageId = null,
    conversationId = null,
}) {
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [currentImageContent, setCurrentImageContent] = useState(content);
    const [imageTimestamp, setImageTimestamp] = useState(Date.now());

    // Lấy hình ảnh đã cập nhật từ Redux store
    const updatedImages = useSelector((state) => state.global?.updatedImages);

    useEffect(() => {
        // Đầu tiên, kiểm tra xem có URL đã lưu trong localStorage không (sau khi refresh)
        if (messageId) {
            const savedImageUrl = localStorage.getItem(`updatedImage_${messageId}`);
            if (savedImageUrl) {
                setCurrentImageContent(savedImageUrl);
                console.log(
                    `Restored image from localStorage for message ${messageId}: ${savedImageUrl}`
                );
            }
        }
    }, [messageId]);

    // Cập nhật hình ảnh hiển thị khi có thay đổi từ Redux
    useEffect(() => {
        if (messageId && updatedImages && updatedImages[messageId]) {
            setCurrentImageContent(updatedImages[messageId]);
            // Tạo timestamp mới để buộc tải lại hình ảnh
            setImageTimestamp(Date.now());
            // Lưu vào localStorage để giữ sau khi refresh
            localStorage.setItem(
                `updatedImage_${messageId}`,
                updatedImages[messageId]
            );
            console.log(
                `Image updated from Redux for message ${messageId}: ${updatedImages[messageId]}`
            );
        }
    }, [messageId, updatedImages]);

    // Thêm tham số timestamp để chống cache
    const getImageUrlWithTimestamp = (url) => {
        if (!url) return fallback;
        // Kiểm tra nếu URL đã có tham số query
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}_t=${imageTimestamp}`;
    };

    const handleEditImage = () => {
        setIsEditModalVisible(true);
    };

    const handleEditCancel = () => {
        setIsEditModalVisible(false);
    };

    const handleEditSuccess = async (editedImageUrl) => {
        try {
            // Cập nhật tin nhắn gốc với ảnh đã chỉnh sửa thay vì tạo tin nhắn mới
            if (messageId) {
                const response = await messageApi.updateImageMessage(
                    messageId,
                    editedImageUrl
                );
                if (response && response.success) {
                    // Cập nhật state và lưu vào localStorage
                    setCurrentImageContent(editedImageUrl);
                    // Tạo timestamp mới để buộc tải lại hình ảnh
                    setImageTimestamp(Date.now());
                    localStorage.setItem(`updatedImage_${messageId}`, editedImageUrl);
                    antdMessage.success("Đã cập nhật ảnh thành công");
                    console.log("Image updated successfully:", response.data);
                } else {
                    antdMessage.error("Có lỗi khi cập nhật ảnh");
                    console.error("Failed to update image:", response);
                }
            } else {
                // Fallback nếu không có messageId
                if (conversationId) {
                    await messageApi.sendTextMessage({
                        type: "IMAGE",
                        content: editedImageUrl,
                        conversationId: conversationId,
                    });
                    antdMessage.success("Đã gửi ảnh đã chỉnh sửa");
                }
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật ảnh:", error);
            antdMessage.error("Không thể cập nhật ảnh đã chỉnh sửa");
        }
        setIsEditModalVisible(false);
    };

    return (
        <>
            <div className="messsage-image-wrapper">
                <div className="message-image--main">
                    <Image
                        src={getImageUrlWithTimestamp(currentImageContent)}
                        fallback={fallback}
                        style={MESSAGE_STYLE.imageStyle}
                        preview={{ mask: <OverlayImage onEdit={handleEditImage} /> }}
                    />
                </div>

                {children}
            </div>

            <div className="time-and-last_view">
                <div className="time-send">
                    <span>
                        {`0${dateAt.getHours()}`.slice(-2)}:
                        {`0${dateAt.getMinutes()}`.slice(-2)}
                    </span>
                </div>

                {isSeen && <div className="is-seen-message">Đã xem</div>}
            </div>

            <EditImageModal
                visible={isEditModalVisible}
                imageUrl={currentImageContent}
                onCancel={handleEditCancel}
                onSuccess={handleEditSuccess}
            />
        </>
    );
}

export default ImageMessage;