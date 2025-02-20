import React, { useEffect } from "react"
import {useNavigate } from "react-router-dom"
import "./NotFoundPage.css"
import Button from "../buttonComponent/Button"

const NotFoundPage = () => {
    const navigate = useNavigate();
    useEffect(() => {
        document.title = "Không tìm thấy trang - Talko Chat"
    }, [])
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Không tìm thấy trang</h2>
        <p className="not-found-message">Xin lỗi, chúng tôi không thể tìm thấy trang bạn đang tìm kiếm.</p>
        <div className="not-found-image-container">
          <img src={require('../../assets/images/notFound.png')} alt="404 Illustration" className="not-found-image" />
        </div>
        <Button type="button" className="button-primary" onClick={()=> navigate("/")} children="Quay về trang chủ" style={{width:"50%"}}/>
      </div>
    </div>
  )
}

export default NotFoundPage;