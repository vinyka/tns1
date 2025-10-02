"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = __importDefault(require("../../models/Setting"));
const GetWelcomeMediaService = async ({ companyId }) => {
    const type = await Setting_1.default.findOne({
        where: {
            key: "welcomeMediaType",
            companyId: null
        }
    });
    const url = await Setting_1.default.findOne({
        where: {
            key: "welcomeMediaUrl",
            companyId: null
        }
    });
    const width = await Setting_1.default.findOne({
        where: {
            key: "welcomeMediaWidth",
            companyId: null
        }
    });
    return {
        type: type?.value || "image",
        url: url?.value || "https://i.imgur.com/ZCODluy.png",
        width: width?.value || "50%"
    };
};
exports.default = GetWelcomeMediaService;
