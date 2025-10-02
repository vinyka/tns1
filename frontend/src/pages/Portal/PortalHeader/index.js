import React from 'react';
import './PortalHeader.css';

const PortalHeader = () => {
    return (
        <header className="sidebar">
            <h2>Central de ajuda</h2>
            <ul>
                <li><a href="#">Home</a></li>
                <li><a href="#">Duvidas Frequentes</a></li>
                <li><a href="/politica">Políticas de privacidade</a></li>
                <li><a href="#">Termos de Uso</a></li>
            </ul>
            <p class="powered">Powered by ZAPRUN</p>
        </header>
    );
};

export default PortalHeader;