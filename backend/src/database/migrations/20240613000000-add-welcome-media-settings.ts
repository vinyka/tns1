import { QueryInterface, DataTypes, Op } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
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

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete("Settings", {
      key: {
        [Op.in]: ["welcomeMediaType", "welcomeMediaUrl", "welcomeMediaWidth"]
      }
    });
  }
}; 