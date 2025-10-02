"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.addColumn("ChatMessages", "files", {
            type: sequelize_1.DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        });
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn("ChatMessages", "files");
    }
};
