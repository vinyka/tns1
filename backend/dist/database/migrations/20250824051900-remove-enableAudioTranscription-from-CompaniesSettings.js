"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.removeColumn("CompaniesSettings", "enableAudioTranscription");
    },
    down: async (queryInterface) => {
        const { DataTypes } = require("sequelize");
        await queryInterface.addColumn("CompaniesSettings", "enableAudioTranscription", {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "disabled",
        });
    }
};
