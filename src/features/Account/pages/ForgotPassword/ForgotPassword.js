import React, { useEffect, useRef, useState } from 'react';
import './ForgotPassword.css';
import { useNavigate } from 'react-router-dom';
import Input from '../../../components/inputComponent/Input';
import VerificationModal from '../../../modals/VerificationPhoneNumberModal/VerificationPhoneNumber';
const ForgotPassword = () => {
    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [errorMess, setErrorMess] = useState("");
    useEffect(() => {
        document.title = "Quên mật khẩu - Talko Chat";
      }, []);
    const inputRef = useRef(null);
    const handleOpenModal = () => {
        const phoneRegex = /^[0-9]{10}$/;
        if(phone && phoneRegex.test(phone)){
            setIsOpen(true);
            setErrorMess("");
        }
        else{
            setErrorMess("Số điện thoại không hợp lệ");
        }
    };
    const handleCloseModal = () => {
        setIsOpen(false);
        inputRef.current.focus();
    };
    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <img src={require('../../../assets/images/Talko_Logo.png')} alt="Talko Logo" style={{ width: "100px", height: "100px" }} />

                <div className="form-container">
                    <p className="instruction">
                        Nhập số điện thoại để nhận mã xác thực
                    </p>
                    <Input ref={inputRef}  type="tel" placeholder="969xxx" value={phone} onChange={(value) => setPhone(value)} />
                    {errorMess && <p className="error-message" style={{color: "red", textAlign: 'left'}}>{errorMess}</p>}
                    <button className="continue-button" onClick={handleOpenModal}>
                        Tiếp tục
                    </button>
                    <VerificationModal isOpenUI={isOpen} phoneNumber={phone} onClose={handleCloseModal} />
                    <a href="#"  
                    className="back-link"
                    onClick={(e)=>{
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
