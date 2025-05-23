import React, { useState, useEffect } from 'react';
import { Upload, Button, message, Modal, Input } from 'antd';
import { FileImageOutlined, DeleteOutlined, CloseCircleOutlined, SendOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import messageApi from '../../apis/messageApi';
import notificationSound from '../../utils/notificationSound';
import './style.css';

MultipleImageUpload.propTypes = {
  conversationId: PropTypes.string.isRequired,
  channelId: PropTypes.string,
  onImagesSent: PropTypes.func,
};

MultipleImageUpload.defaultProps = {
  channelId: null,
  onImagesSent: null,
};

function MultipleImageUpload({ conversationId, channelId, onImagesSent }) {
  const [fileList, setFileList] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Reset fileList when conversation changes
  useEffect(() => {
    setFileList([]);
    setTextContent('');
  }, [conversationId]);

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = async (file) => {
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
    setPreviewTitle(file.name || file.url.substring(file.url.lastIndexOf('/') + 1));
  };

  const handleChange = (info) => {
    // info.fileList: all files currently selected (including previous)
    // info.file: the latest file selected
    // info.event: the event
    let newFiles = info.fileList.filter(file =>
      file.type?.startsWith('image/') || (file.originFileObj && file.originFileObj.type.startsWith('image/'))
    );
    setFileList(prevList => {
      // Merge old and new, avoid duplicates by uid
      const merged = [...prevList];
      newFiles.forEach(newFile => {
        if (!merged.some(f => f.uid === newFile.uid)) {
          merged.push(newFile);
        }
      });
      if (merged.length > 10) {
        message.warning('You can only upload up to 10 images at a time');
        return merged.slice(0, 10);
      }
      return merged;
    });
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
    }
    
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
    }
    
    return isImage && isLt5M;
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please select at least one image to upload');
      return;
    }

    const formData = new FormData();
    fileList.forEach((file) => {
      formData.append('files', file.originFileObj);
    });

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await messageApi.sendMultipleImageMessage(
        formData,
        textContent,
        conversationId,
        channelId,
        (percentCompleted) => {
          setUploadProgress(percentCompleted);
        }
      );

      if (response && response._id) {
        notificationSound.markMessageAsSent(response._id);
      }

      setFileList([]);
      setTextContent('');
      message.success('Images uploaded successfully');
      
      if (onImagesSent) {
        onImagesSent();
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      message.error('Failed to upload images');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = (file) => {
    const index = fileList.indexOf(file);
    const newFileList = fileList.slice();
    newFileList.splice(index, 1);
    setFileList(newFileList);
  };

  const handleTextChange = (e) => {
    setTextContent(e.target.value);
  };

  const uploadButton = (
    <div>
      <FileImageOutlined />
      <div style={{ marginTop: 8 }}>Select Images</div>
    </div>
  );

  return (
    <div className="multiple-image-upload">
      <div className="image-preview-container">
        {fileList.length > 0 && (
          <div className="selected-images">
            <h4>Selected Images ({fileList.length})</h4>
            <div className="image-preview-grid">
              {fileList.map((file, index) => (
                <div key={index} className="image-preview-item">
                  <div className="image-preview">
                    <img 
                      src={file.url || URL.createObjectURL(file.originFileObj)} 
                      alt={`Preview ${index}`}
                      onClick={() => handlePreview(file)}
                    />
                    <Button 
                      className="remove-image-btn"
                      icon={<CloseCircleOutlined />}
                      onClick={() => handleRemoveImage(file)}
                      shape="circle"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fileList.length < 10 && (
          <Upload
            listType="picture-card"
            fileList={fileList}
            onPreview={handlePreview}
            onChange={handleChange}
            beforeUpload={beforeUpload}
            multiple={true}
            showUploadList={false}
            accept="image/*"
          >
            {uploadButton}
          </Upload>
        )}
      </div>

      {fileList.length > 0 && (
        <div className="text-content-input">
          <Input.TextArea
            placeholder="Add a caption for your images..."
            value={textContent}
            onChange={handleTextChange}
            autoSize={{ minRows: 1, maxRows: 4 }}
          />
          
          <div className="upload-actions">
            <Button 
              danger
              icon={<DeleteOutlined />}
              onClick={() => setFileList([])}
              disabled={uploading}
            >
              Clear
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleUpload}
              loading={uploading}
              disabled={uploading}
            >
              {uploading ? `Uploading ${uploadProgress}%` : 'Send'}
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
      >
        <img alt="Preview" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </div>
  );
}

export default MultipleImageUpload;
