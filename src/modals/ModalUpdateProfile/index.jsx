import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Input, Button, Avatar, DatePicker, Radio, Form } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';
import './style.css';
import meApi from 'api/meApi';

const ModalUpdateProfile = ({ open = false, onCancel = null, onOk = null, loading = false }) => {
    const { user } = useSelector((state) => state.global);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const convertDateObjectToDayjs = (dateObj) => {
        if (!dateObj || !dateObj.year || !dateObj.month || !dateObj.day) return null;
        return dayjs(`${dateObj.year}-${dateObj.month}-${dateObj.day}`, 'YYYY-M-D');
    };
    const convertDayjsToDateObject = (date) => {
        if (!date) return null;
        return {
            day: date.date(),
            month: date.month() + 1,
            year: date.year(),
        };
    };
    const handleCancel = () => {
        onCancel(false);
    }
    // Formik setup
    const formik = useFormik({
        initialValues: {
            name: user?.name || '',
            gender: user?.gender?1:0,
            dateOfBirth: convertDateObjectToDayjs(user?.dateOfBirth) || '',
            avatar: user?.avatar || '',
        },
        validationSchema: Yup.object({
            name: Yup.string().required('Vui lòng nhập họ và tên'),
            dateOfBirth: Yup.string().required('Vui lòng chọn ngày sinh'),
            avatar: Yup.string().url('URL không hợp lệ'),
        }),
        onSubmit: async (values) => {
            setConfirmLoading(true);
            const dateOfBirthConvert = convertDayjsToDateObject(values.dateOfBirth);
            
            // const {day, month, year} = formik.values.dateOfBirth;
            try{
                const {name, gender} = values;
                await meApi.updateProfile(name, dateOfBirthConvert, gender);
            }
            catch(err){
                console.log(err);
            }
            console.log('values', values);
            
            setConfirmLoading(false);

            
            if (onOk) onOk(values);
            if (onCancel) onCancel();
        },
    });
    
    return (
        <Modal
            title="Cập nhật thông tin cá nhân"
            open={open}
            onCancel={handleCancel}
            onOk={formik.handleSubmit}
            confirmLoading={confirmLoading}
            className='modal-update-profile'
            okText="Cập nhật"
            cancelText="Hủy"
            width={400}
        >
            <Form layout="vertical" onFinish={formik.handleSubmit} >
                <div className='avatar-container'>
                    <Avatar size={80} src={formik.values.avatar} icon={<UserOutlined />} />
                    <Input
                        name="avatar"
                        placeholder="Dán URL ảnh vào đây"
                        value={formik.values.avatar}
                        onChange={formik.handleChange}
                        className='input-field'
                    />
                    {formik.errors.avatar && <div className="error">{formik.errors.avatar}</div>}
                </div>

                <Form.Item label="Họ và tên">
                    <Input
                        name="name"
                        placeholder="Họ và tên"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        className='input-field'
                    />
                    {formik.errors.name && <div className="error">{formik.errors.name}</div>}
                </Form.Item>

                <Form.Item label="Giới tính">
                    <Radio.Group
                        name="gender"
                        onChange={(e) => formik.setFieldValue('gender', e.target.value)}
                        value={formik.values.gender}
                        className='radio-group'
                    >
                        <Radio value={1}>Nam</Radio>
                        <Radio value={0}>Nữ</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item label="Ngày sinh">
                    <DatePicker
                        placeholder="Chọn ngày sinh"
                        onChange={(date) => formik.setFieldValue('dateOfBirth', date)}
                        value={formik.values.dateOfBirth}
                        className='datepicker-field'
                    />
                    {formik.errors.dateOfBirth && <div className="error">{formik.errors.dateOfBirth}</div>}
                </Form.Item>
            </Form>
        </Modal>
    );
};

ModalUpdateProfile.propTypes = {
    open: PropTypes.bool,
    onCancel: PropTypes.func,
    onOk: PropTypes.func,
    loading: PropTypes.bool,
};

export default ModalUpdateProfile;
