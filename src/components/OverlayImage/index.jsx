import React from "react";
import { EditOutlined, EyeOutlined } from "@ant-design/icons";
import "./style.css";


function OverlayImage(props) {
    const { onEdit } = props;

    return (
        <div className="overlay-item">
            <div className="overlay-actions">
                <button className="overlay-button view-button" aria-label="Xem ảnh">
                    <EyeOutlined />
                </button>
                {onEdit && (
                    <button
                        className="overlay-button edit-button"
                        aria-label="Chỉnh sửa ảnh"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                    >
                        <EditOutlined />
                    </button>
                )}
            </div>
            {props.children}
        </div>
    );
}

export default OverlayImage;