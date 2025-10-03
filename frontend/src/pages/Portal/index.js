// src/MainContent.js

import React from 'react';
import './MainContent.css';
import PortalHeader from './PortalHeader';
import PoliticaPrivacidade from './LGPD';

const PortalMainContent = () => {
    return (
        <div className="container">
            <PortalHeader/>
            <div class="main">
            <PoliticaPrivacidade/>
            </div>
        </div>
    );
};

export default PortalMainContent;