import { Tabs } from 'antd';
import ConverMutipleSearch from '../../../../components/ConverMutipleSearch';
import ConverPersonalSearch from '../ConverPersonalSearch';
import PropTypes from 'prop-types';
import React from 'react';
import './style.css';

FilterContainer.propTypes = {
    dataSingle: PropTypes.array,
    dataMutiple: PropTypes.array,
};

FilterContainer.defaultProps = {
    dataMutiple: [],
    dataSingle: []
};


function FilterContainer({ dataMutiple, dataSingle }) {

    const { TabPane } = Tabs;
    const items = [
        {
            key: "1",
            label: "Cá nhân",
            children: <ConverPersonalSearch data={dataSingle} />,
        },
        {
            key: "2",
            label: "Nhóm",
            children: <ConverMutipleSearch data={dataMutiple} />,
        },
    ];
    return (
        <div className='filter-container'>
            <Tabs defaultActiveKey="1" items={items} />
        </div>
    );
}

export default FilterContainer;