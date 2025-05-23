import React, { useEffect, useRef, useState } from 'react';
import './ForgotPassword.css';
import { useNavigate } from 'react-router-dom';
import Input from '../../../components/inputComponent/Input';
import VerificationModal from '../../../modals/VerificationPhoneNumberModal/VerificationPhoneNumber';
const ForgotPassword = () => {
    const navigate = useNavigate();
    const [account, setAccount] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    useEffect(() => {
        document.title = "Quên mật khẩu - Talko Chat";
    }, []);
    const inputRef = useRef(null);
    const handleOpenModal = () => {
        setIsOpen(true);
    };
    const handleCloseModal = () => {
        setIsOpen(false);
        if (inputRef.current)
            inputRef.current.focus();
    };
    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <img src={require('../../../assets/images/Talko_Logo.png')} alt="Talko Logo" style={{ width: "100px", height: "100px" }} />

                <div className="form-container">
                    <p className="instruction">
                        Nhập tài khoản để nhận mã xác thực
                    </p>
                    <Input ref={inputRef} type="text" placeholder="Email đã đăng ký" value={account} onChange={(value) => setAccount(value)} />
                    <button className="continue-button" onClick={handleOpenModal}>
                        Tiếp tục
                    </button>
                    <VerificationModal isOpenUI={isOpen} account={account} onClose={handleCloseModal} />
                    <a href="#"
                        className="back-link"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(-1);
                        }}>
                        « Quay lại
                    </a>
                </div>
            </div>
        </div>
    );
}
export default ForgotPassword;
