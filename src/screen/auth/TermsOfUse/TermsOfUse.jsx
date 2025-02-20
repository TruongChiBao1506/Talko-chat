import React, { useEffect } from "react"
import "./TermsOfUse.css"
import Button from "../../../components/buttonComponent/Button"
import { useNavigate } from "react-router-dom";

const TermsOfUse = () => {
    const navigate = useNavigate();
    useEffect(() => {
        document.title = "Điều khoản sử dụng - Talko Chat"
    }, [])

    return (
        <div className="terms-of-use">
            <header className="header">
                <div className="logo">
                    <img src={require('../../../assets/images/Talko_Logo.png')} alt="Talko Logo" />
                </div>
                <h1>Điều khoản sử dụng</h1>
            </header>

            <main className="main-content">
                <section>
                    <h2>1. Chấp nhận điều khoản</h2>
                    <p>
                        Bằng cách truy cập và sử dụng dịch vụ này, bạn chấp nhận và đồng ý bị ràng buộc bởi các điều khoản và quy
                        định của thỏa thuận này.
                    </p>
                </section>

                <section>
                    <h2>2. Mô tả dịch vụ</h2>
                    <p>
                        Dịch vụ của chúng tôi cung cấp cho người dùng [mô tả ngắn gọn về dịch vụ của bạn]. Chúng tôi có quyền sửa
                        đổi hoặc ngừng dịch vụ bất cứ lúc nào.
                    </p>
                </section>

                <section>
                    <h2>3. Hành vi người dùng</h2>
                    <p>
                        Người dùng đồng ý chỉ sử dụng dịch vụ cho các mục đích hợp pháp và theo cách không vi phạm quyền, hạn chế
                        hoặc cản trở việc sử dụng và hưởng thụ dịch vụ của bất kỳ ai khác.
                    </p>
                </section>

                <section>
                    <h2>4. Quyền sở hữu trí tuệ</h2>
                    <p>
                        Tất cả nội dung được đưa vào trang web này, như văn bản, đồ họa, logo, biểu tượng nút, hình ảnh, clip âm
                        thanh, tải xuống kỹ thuật số, tổng hợp dữ liệu và phần mềm, đều là tài sản của công ty chúng tôi hoặc các
                        nhà cung cấp nội dung của nó và được bảo vệ bởi luật bản quyền quốc tế.
                    </p>
                </section>

                <section>
                    <h2>5. Giới hạn trách nhiệm</h2>
                    <p>
                        Chúng tôi sẽ không chịu trách nhiệm cho bất kỳ thiệt hại gián tiếp, ngẫu nhiên, đặc biệt, hậu quả hoặc trừng
                        phạt nào, hoặc bất kỳ mất mát lợi nhuận hoặc doanh thu nào, cho dù phát sinh trực tiếp hay gián tiếp, hoặc
                        bất kỳ mất mát dữ liệu, sử dụng, uy tín hoặc các tổn thất vô hình khác.
                    </p>
                </section>
                <section style={{textAlign:"center"}}>
                    <Button type = "button" className="button-primary" style={{width:"30%"}} children="Quay lại" onClick={()=>navigate(-1)}/>
                </section>
            </main>

            <footer className="footer">
                <p>&copy; 2025 Talko. Bảo lưu mọi quyền.</p>
            </footer>
        </div>
    )
}

export default TermsOfUse

