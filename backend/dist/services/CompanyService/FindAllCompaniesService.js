"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Company_2 = __importDefault(require("../../models/Company"));
const Plan_2 = __importDefault(require("../../models/Plan"));
const Setting_1 = __importDefault(require("../../models/Setting"));
const FindAllCompanyService = async () => {
    const companies = await Company_2.default.findAll({
        order: [["name", "ASC"]],
        include: [
            { model: Plan_2.default, as: "plan", attributes: ["id", "name", "amount"] },
            { model: Setting_1.default, as: "settings" }
        ]
    });
    return companies;
};
exports.default = FindAllCompanyService;
