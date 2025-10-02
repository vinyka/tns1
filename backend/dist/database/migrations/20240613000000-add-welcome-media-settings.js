"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.bulkInsert("Settings", [
            {
                key: "welcomeMediaType",
                value: "image",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                key: "welcomeMediaUrl",
                value: "https://i.imgur.com/ZCODluy.png",
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                key: "welcomeMediaWidth",
                value: "50%",
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);
    },
    down: async (queryInterface) => {
        await queryInterface.bulkDelete("Settings", {
            key: {
                [sequelize_1.Op.in]: ["welcomeMediaType", "welcomeMediaUrl", "welcomeMediaWidth"]
            }
        });
    }
};
