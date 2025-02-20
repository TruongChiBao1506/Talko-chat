import { X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import './VerificationPhoneNumber.css'
import Button from '../../components/buttonComponent/Button';
import { Link, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import authApi from '../../apis/authApi';
import { useDispatch } from 'react-redux'
import { setLoading } from '../../screen/auth/authSlice';

const VerificationModal = ({ isOpenUI, account, onClose }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isOpen, setIsOpen] = useState(isOpenUI);
    useEffect(() => {
        setIsOpen(isOpenUI);
    }, [isOpenUI]);
    const isPhoneNumber = (input) => {
        const phoneRegex = /^\d{10}$/; // Kiểm tra số điện thoại (10 chữ số)
        return phoneRegex.test(input);
    };
    // Hàm đóng modal và gọi onClose để thông báo cho component cha
    const handleCloseOnly = () => {
        setIsOpen(false);
        onClose();// Gọi onClose để cập nhật trạng thái ở component cha
    };
    const handleConfirmAndClose = async (account) => {
        dispatch(setLoading(true));
        await authApi.fetchUser(account)
            .then(async () => {
                await authApi.resetOtp(account)
                .then(() => {
                    dispatch(setLoading(false));
                    navigate('/auth/password-recovery', { state: { account: account } });
                })
                
            })
            .catch(() => {
                dispatch(setLoading(false));
                setIsOpen(false);
                onClose();// Gọi onClose để cập nhật trạng thái ở component cha
                message.error('Số điện thoại hoặc email không tồn tại');
            })
    };
    return (isOpen &&
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>Talko - Xác nhận</h2>
                    <button
                        className="close-button"
                        onClick={handleCloseOnly}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-content">
                    <h3>Xác nhận tài khoản:</h3>
                    <p className="phone-number">
                        {isPhoneNumber(account) ? `+84 ${account}` : account}
                    </p>

                    <p className="description">
                        Mã xác thực sẽ được gửi đến số điện thoại trên thông qua tin nhắn hoặc cuộc gọi từ Talko. Vui lòng dùng mã xác thực này để đặt lại mật khẩu.
                    </p>

                    <div className="button-group">
                        <button className="change-button" onClick={handleCloseOnly}>Thay đổi</button>
                        {/* <button className="verify-button">Xác nhận</button> */}
                        <Button onClick={() => handleConfirmAndClose(account)} children="Xác nhận" className="button-primary" style={{ width: '30%' }} />

                    </div>
                </div>
            </div>
        </div>
    )
}
export default VerificationModal;

