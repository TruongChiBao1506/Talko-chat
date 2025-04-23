import { Col, Row, Select } from 'antd';
import RangeCalendarCustom from '../../../../components/RangeCalendarCustom';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import fileHelpers from '../../../../utils/fileHelpers';
import PersonalIcon from '../PersonalIcon';
import './style.css';

TabPaneMedia.propTypes = {
    members: PropTypes.array,
    onQueryChange: PropTypes.func,
};


function TabPaneMedia({ members = [], onQueryChange = null }) {
    // const { members, onQueryChange } = props;
    const { Option } = Select;

    const [sender, setSender] = useState('');
    const [query, setQuery] = useState({});
    const handleChange = (memberId) => {


        const index = members.findIndex(
            (memberEle) => memberEle._id == memberId
        );
        let queryTempt = {};

        if (index > -1) {
            setSender(members[index].name);
            queryTempt = {
                ...query,
                senderId: memberId,
            };
            setQuery(queryTempt);
        } else {
            setSender('');
            queryTempt = {
                ...query,
                senderId: '',
            };
            setQuery(queryTempt);
        }

        if (onQueryChange) onQueryChange(queryTempt);
    };


    const handleDatePickerChange = (date, dateString) => {
        const queryTempt = {
            ...query,
            ...fileHelpers.convertDateStringsToServerDateObject(dateString),
        };
        setQuery({ ...query, queryTempt });
        if (onQueryChange) onQueryChange(queryTempt);
    };


    return (
        <div id='tabpane-media'>
            <Row gutter={[16, 8]}>
                <Col span={24}>
                    <Select
                        dropdownMatchSelectWidth={false}
                        optionLabelProp="label"
                        showSearch
                        style={{ width: '100%' }}
                        onChange={handleChange}
                        placeholder="Người gửi"
                        optionFilterProp="children"
                        value={sender}
                        allowClear
                        filterOption={(input, option) =>
                            option?.label?.toLowerCase().includes(input.toLowerCase())
                        }
                        filterSort={(optionA, optionB) =>
                            optionA.label.toLowerCase().localeCompare(optionB.label.toLowerCase())
                        }
                    >
                        {members.map((memberEle, index) => (
                            <Option
                                key={index}
                                value={memberEle._id}
                                label={memberEle.name} // 🔥 Dùng label để sắp xếp
                            >
                                <div className="option-item">
                                    <div className="icon-user-item">
                                        <PersonalIcon
                                            demention={24}
                                            avatar={memberEle.avatar}
                                            name={memberEle.name}
                                        />
                                    </div>
                                    <div className="name-user-item">{memberEle.name}</div>
                                </div>
                            </Option>
                        ))}
                    </Select>
                </Col>

                <Col span={24}>
                    <RangeCalendarCustom
                        style={{ width: '100%' }}
                        onChange={handleDatePickerChange}
                        allowClear={true}
                    />
                </Col>
            </Row>
        </div>
    );
}

export default TabPaneMedia;