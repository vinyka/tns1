import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("ChatMessages", "files", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("ChatMessages", "files");
  }
}; 