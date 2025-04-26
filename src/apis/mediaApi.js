import axiosClient from "./axiosClient";

const API_URL = "/messages";

const mediaApi = {
  fetchAllMedia: (
    conversationId,
    type = "ALL",
    senderId,
    startTime,
    endTime
  ) => {
    return axiosClient.get(`${API_URL}/${conversationId}/files`, {
      params: {
        type,
        senderId,
        startTime,
        endTime,
      },
    });
  },

  // API mới cho chức năng chỉnh sửa ảnh
  editImage: (imageFile, text) => {
    const url = "/edit-image";
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("text", text);

    return axiosClient.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export default mediaApi;
