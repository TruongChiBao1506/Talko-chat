import FileItem from '../../../../components/FileItem';
import PropTypes from 'prop-types';
import React from 'react';
import './style.css';

ContentTabPaneFile.propTypes = {
    items: PropTypes.array,
};


function ContentTabPaneFile({items = []}) {

    return (
        <div id='conten-tabpane-file'>
            {items.map((itemEle, index) => (
                <FileItem
                    key={index}
                    file={itemEle}
                    inArchive={true}
                />
            ))}
        </div>
    );
}

export default ContentTabPaneFile;