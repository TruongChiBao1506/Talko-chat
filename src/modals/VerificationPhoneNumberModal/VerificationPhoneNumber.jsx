import { X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import './VerificationPhoneNumber.css'
import Button from '../../components/buttonComponent/Button';

const VerificationModal = ({ isOpenUI, phoneNumber, onClose }) => {

    const [isOpen, setIsOpen] = useState(isOpenUI);
    useEffect(() => {
        setIsOpen(isOpenUI);
    }, [isOpenUI]);
    // Hàm đóng modal và gọi onClose để thông báo cho component cha
    const handleCloseModal = () => {
        setIsOpen(false);
        onClose();// Gọi onClose để cập nhật trạng thái ở component cha
    };
    return (isOpen &&
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>Talko - Xác nhận</h2>
                    <button
                        className="close-button"
                        onClick={handleCloseModal}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-content">
                    <h3>Xác nhận số điện thoại:</h3>
                    <p className="phone-number">+84 {phoneNumber}</p>

                    <p className="description">
                        Mã xác thực sẽ được gửi đến số điện thoại trên thông qua tin nhắn hoặc cuộc gọi từ Zalo. Vui lòng dùng mã xác thực này để đặt lại mật khẩu.
                    </p>

                    <div className="button-group">
                        <button className="change-button" onClick={handleCloseModal}>Thay đổi</button>
                        {/* <button className="verify-button">Xác nhận</button> */}
                        <a href="/password-recovery" style={{width: '30%'}}>
                            <Button onClick={handleCloseModal} children="Xác nhận" className="button-primary" style={{ width: '100%' }} />
                        </a>

                    </div>
                </div>
            </div>
        </div>
    )
}
export default VerificationModal;

