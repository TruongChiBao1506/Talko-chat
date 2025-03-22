// import React, { useRef, useState } from 'react';
// import PropTypes from 'prop-types';
// import { Modal, Input, Button, Avatar, DatePicker, Radio, Form } from 'antd';
// import { UserOutlined } from '@ant-design/icons';
// import { useSelector } from 'react-redux';
// import { useFormik } from 'formik';
// import meApi from '../../apis/meApi';
// import * as Yup from 'yup';
// import dayjs from 'dayjs';
// import './style.css';

// const ModalUpdateProfile = ({ open = false, onCancel = null, onOk = null, loading = false }) => {
//     const { user } = useSelector((state) => state.global);
//     const [confirmLoading, setConfirmLoading] = useState(false);
//     const convertDateObjectToDayjs = (dateObj) => {
//         if (!dateObj || !dateObj.year || !dateObj.month || !dateObj.day) return null;
//         return dayjs(`${dateObj.year}-${dateObj.month}-${dateObj.day}`, 'YYYY-M-D');
//     };
//     const convertDayjsToDateObject = (date) => {
//         if (!date) return null;
//         return {
//             day: date.date(),
//             month: date.month() + 1,
//             year: date.year(),
//         };
//     };
//     const handleCancel = () => {
//         onCancel(false);
//     }
//     // Formik setup
//     const formik = useFormik({
//         initialValues: {
//             name: user?.name || '',
//             gender: user?.gender?1:0,
//             dateOfBirth: convertDateObjectToDayjs(user?.dateOfBirth) || '',
//             avatar: user?.avatar || '',
//         },
//         validationSchema: Yup.object({
//             name: Yup.string().required('Vui lòng nhập họ và tên'),
//             dateOfBirth: Yup.string().required('Vui lòng chọn ngày sinh'),
//             avatar: Yup.string().url('URL không hợp lệ'),
//         }),
//         onSubmit: async (values) => {
//             setConfirmLoading(true);
//             const dateOfBirthConvert = convertDayjsToDateObject(values.dateOfBirth);
            
//             // const {day, month, year} = formik.values.dateOfBirth;
//             try{
//                 const {name, gender} = values;
//                 await meApi.updateProfile(name, dateOfBirthConvert, gender);
//             }
//             catch(err){
//                 console.log(err);
//             }
//             console.log('values', values);
            
//             setConfirmLoading(false);

            
//             if (onOk) onOk(values);
//             if (onCancel) onCancel();
//         },
//     });
    
//     return (
//         <Modal
//             title="Cập nhật thông tin cá nhân"
//             open={open}
//             onCancel={handleCancel}
//             onOk={formik.handleSubmit}
//             confirmLoading={confirmLoading}
//             className='modal-update-profile'
//             okText="Cập nhật"
//             cancelText="Hủy"
//             width={400}
//         >
//             <Form layout="vertical" onFinish={formik.handleSubmit} >
//                 <div className='avatar-container'>
//                     <Avatar size={80} src={formik.values.avatar} icon={<UserOutlined />} />
//                     <Input
//                         name="avatar"
//                         placeholder="Dán URL ảnh vào đây"
//                         value={formik.values.avatar}
//                         onChange={formik.handleChange}
//                         className='input-field'
//                     />
//                     {formik.errors.avatar && <div className="error">{formik.errors.avatar}</div>}
//                 </div>

//                 <Form.Item label="Họ và tên">
//                     <Input
//                         name="name"
//                         placeholder="Họ và tên"
//                         value={formik.values.name}
//                         onChange={formik.handleChange}
//                         className='input-field'
//                     />
//                     {formik.errors.name && <div className="error">{formik.errors.name}</div>}
//                 </Form.Item>

//                 <Form.Item label="Giới tính">
//                     <Radio.Group
//                         name="gender"
//                         onChange={(e) => formik.setFieldValue('gender', e.target.value)}
//                         value={formik.values.gender}
//                         className='radio-group'
//                     >
//                         <Radio value={1}>Nam</Radio>
//                         <Radio value={0}>Nữ</Radio>
//                     </Radio.Group>
//                 </Form.Item>

//                 <Form.Item label="Ngày sinh">
//                     <DatePicker
//                         placeholder="Chọn ngày sinh"
//                         onChange={(date) => formik.setFieldValue('dateOfBirth', date)}
//                         value={formik.values.dateOfBirth}
//                         className='datepicker-field'
//                     />
//                     {formik.errors.dateOfBirth && <div className="error">{formik.errors.dateOfBirth}</div>}
//                 </Form.Item>
//             </Form>
//         </Modal>
//     );
// };

// ModalUpdateProfile.propTypes = {
//     open: PropTypes.bool,
//     onCancel: PropTypes.func,
//     onOk: PropTypes.func,
//     loading: PropTypes.bool,
// };

// export default ModalUpdateProfile;
import { Col, Modal, Row } from 'antd';
import meApi from '../../apis/meApi'
import { setAvatarProfile } from '../../redux/globalSlice';
import UploadAvatar from '../../screen/Chat/components/UploadAvatar';
import UploadCoverImage from '../../screen/Chat/components/UploadCoverImage';
import DateOfBirthField from '../../customfields/DateOfBirthField';
import GenderRadioField from '../../customfields/GenderRadioField';
import InputFieldNotTitle from '../../customfields/InputFieldNotTitle';
import { FastField, Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';

import './style.css';

ModalUpdateProfile.propTypes = {
    open: PropTypes.bool,
    onCancel: PropTypes.func,
    onOk: PropTypes.func,
    loading: PropTypes.bool,
};

ModalUpdateProfile.defaultProps = {
    open: false,
    onCancel: null,
    onOk: null,
    loading: false,
};

function ModalUpdateProfile({ open, onCancel, onOk, loading }) {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.global);
    const formRef = useRef();



    // 
    const [avatar, setAvatar] = useState(null);
    const [coverImg, setCoverImg] = useState(null);
    const [isClear, setIsClear] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const refInitValue = useRef();




    const handleGetCoverImg = (coverImg) => {
        setCoverImg(coverImg);
    }

    const handleGetAvatar = (avatar) => {
        console.log('avatar', avatar);
        setAvatar(avatar);
    }



    const userData = useMemo(() => ({
        name: user.name,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender
    }), [open]);
    
    useEffect(() => {
        if (open) {
            setIsClear(false);
            refInitValue.current = userData;
        }
    }, [open, userData]);
    



    const checkChangeValue = (value1, value2) => {
        if (value1.name !== value2.name) {
            return false
        }
        if (value1.dateOfBirth !== value2.dateOfBirth) {
            return false
        }
        if (value1.gender !== value2.gender) {
            return false
        }
        return true;
    }





    const handleCancel = () => {
        onCancel(false);
        setIsClear(true);
        setCoverImg(null);
        setAvatar(null)
    };

    const handleSubmit = async (values) => {
        setConfirmLoading(true);

        try {

            if (!checkChangeValue(values, refInitValue.current)) {
                const { name, dateOfBirth, gender } = values;
                await meApi.updateProfile(name, dateOfBirth, gender);

            }


            if (coverImg) {
                const frmData = new FormData();
                frmData.append('file', coverImg)
                await meApi.updateCoverImage(frmData);

            }


            if (avatar) {
                const frmData = new FormData();
                frmData.append('file', avatar)
                const response = await meApi.updateAvatar(frmData);
                dispatch(setAvatarProfile(response.avatar));


            }
            setIsClear(true);


        } catch (error) {
            console.log(error);
        }

        setConfirmLoading(false);

        if (onCancel) {
            onCancel()
        }


    };

    const handleOke = () => {
        if (formRef.current) {
            formRef.current.handleSubmit();
        }
    };

    return (
        <Modal
            title="Cập nhật thông tin"
            open={open}
            onOk={handleOke}
            onCancel={handleCancel}
            width={400}
            style={{ padding: 0 }}
            okText='Cập nhật'
            cancelText='Hủy'
            centered
            confirmLoading={confirmLoading}

        >

            <div className="profile-update_wrapper">
                <div className="profile-update_img">
                    <div className="profile-update_cover-image">
                        <div className="profile-update_upload">
                            <UploadCoverImage
                                coverImg={user.coverImage}
                                getFile={handleGetCoverImg}
                                isClear={isClear}
                            />
                        </div>

                        <div className="profile-update_avatar">
                            <UploadAvatar
                                avatar={user.avatar}
                                getFile={handleGetAvatar}
                                isClear={isClear}
                            />
                        </div>
                    </div>
                </div>

                <div className="profile-update_info">
                    <Formik
                        innerRef={formRef}
                        initialValues={{
                            name: user.name,
                            dateOfBirth: user.dateOfBirth,
                            gender: user.gender ? 1 : 0,
                        }}
                        onSubmit={handleSubmit}
                        validationSchema={Yup.object().shape({
                            name: Yup.string()
                                .required('Tên không được bỏ trống')
                                .max(100, 'Tên tối đa 100 kí tự'),
                        })}
                        enableReinitialize={true}
                    >
                        {(formikProps) => {
                            return (
                                <Form>
                                    <Row gutter={[0, 16]}>
                                        <Col span={24}>
                                            <p>Tên </p>
                                            <FastField
                                                name="name"
                                                component={InputFieldNotTitle}
                                                type="text"
                                                maxLength={100}
                                            ></FastField>
                                        </Col>

                                        <Col span={24}>
                                            <p>Ngày sinh</p>
                                            <FastField
                                                name="dateOfBirth"
                                                component={DateOfBirthField}
                                            ></FastField>
                                        </Col>

                                        <Col span={24}>
                                            <p>Giới tính</p>
                                            <FastField
                                                name="gender"
                                                component={GenderRadioField}
                                            ></FastField>
                                        </Col>
                                    </Row>
                                </Form>
                            );
                        }}
                    </Formik>
                </div>
            </div>

        </Modal>
    );
}

export default ModalUpdateProfile;
