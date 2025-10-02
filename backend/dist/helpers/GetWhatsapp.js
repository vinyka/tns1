"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetWhatsApp = void 0;
const AppError_1 = __importDefault(require("../errors/AppError"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const GetDefaultWhatsAppByUser_1 = __importDefault(require("./GetDefaultWhatsAppByUser"));
const GetWhatsApp = async (whatsappId, companyId = null, userId) => {
    let connection = null;
    console.log({ whatsappId, companyId, userId });
    if (whatsappId) {
        connection = await Whatsapp_1.default.findOne({
            where: { id: whatsappId, companyId }
        });
    }
    else {
        connection = await Whatsapp_1.default.findOne({
            where: { status: "CONNECTED", companyId, isDefault: true }
        });
    }
    if (!connection || connection.status !== 'CONNECTED') {
        connection = await Whatsapp_1.default.findOne({
            where: { status: "CONNECTED", companyId }
        });
    }
    if (userId) {
        const whatsappByUser = await (0, GetDefaultWhatsAppByUser_1.default)(userId);
        if (whatsappByUser && whatsappByUser.status === 'CONNECTED') {
            connection = whatsappByUser;
        }
    }
    if (!connection) {
        throw new AppError_1.default(`No default WhatsApp found for company ${companyId}.`);
    }
    return connection;
};
exports.GetWhatsApp = GetWhatsApp;
