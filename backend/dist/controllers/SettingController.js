"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWelcomeMedia = exports.getWelcomeMedia = exports.storePrivateFile = exports.storeLogo = exports.publicShow = exports.updateOne = exports.getSetting = exports.update = exports.showOne = exports.index = void 0;
const socket_1 = require("../libs/socket");
const AppError_1 = __importDefault(require("../errors/AppError"));
const UpdateSettingService_1 = __importDefault(require("../services/SettingServices/UpdateSettingService"));
const ListSettingsService_1 = __importDefault(require("../services/SettingServices/ListSettingsService"));
const ListSettingsServiceOne_1 = __importDefault(require("../services/SettingServices/ListSettingsServiceOne"));
const GetSettingService_1 = __importDefault(require("../services/SettingServices/GetSettingService"));
const UpdateOneSettingService_1 = __importDefault(require("../services/SettingServices/UpdateOneSettingService"));
const GetPublicSettingService_1 = __importDefault(require("../services/SettingServices/GetPublicSettingService"));
const GetWelcomeMediaService_1 = __importDefault(require("../services/SettingServices/GetWelcomeMediaService"));
const UpdateWelcomeMediaService_1 = __importDefault(require("../services/SettingServices/UpdateWelcomeMediaService"));
const Company_2 = __importDefault(require("../models/Company"));
const index = async (req, res) => {
    const { companyId } = req.user;
    // if (req.user.profile !== "admin") {
    //   throw new AppError("ERR_NO_PERMISSION", 403);
    // }
    const settings = await (0, ListSettingsService_1.default)({ companyId });
    return res.status(200).json(settings);
};
exports.index = index;
const showOne = async (req, res) => {
    const { companyId } = req.user;
    const { settingKey: key } = req.params;
    console.log("|======== GetPublicSettingService ========|");
    console.log("key", key);
    console.log("|=========================================|");
    const settingsTransfTicket = await (0, ListSettingsServiceOne_1.default)({ companyId: companyId, key: key });
    return res.status(200).json(settingsTransfTicket);
};
exports.showOne = showOne;
const update = async (req, res) => {
    if (req.user.profile !== "admin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { settingKey: key } = req.params;
    const { value } = req.body;
    const { companyId } = req.user;
    const setting = await (0, UpdateSettingService_1.default)({
        key,
        value,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.of(String(companyId))
        .emit(`company-${companyId}-settings`, {
        action: "update",
        setting
    });
    return res.status(200).json(setting);
};
exports.update = update;
const getSetting = async (req, res) => {
    const { settingKey: key } = req.params;
    const setting = await (0, GetSettingService_1.default)({ key });
    return res.status(200).json(setting);
};
exports.getSetting = getSetting;
const updateOne = async (req, res) => {
    const { settingKey: key } = req.params;
    const { value } = req.body;
    const setting = await (0, UpdateOneSettingService_1.default)({
        key,
        value
    });
    return res.status(200).json(setting);
};
exports.updateOne = updateOne;
const publicShow = async (req, res) => {
    console.log("|=============== publicShow  ==============|");
    const { settingKey: key } = req.params;
    const settingValue = await (0, GetPublicSettingService_1.default)({ key });
    return res.status(200).json(settingValue);
};
exports.publicShow = publicShow;
const storeLogo = async (req, res) => {
    const file = req.file;
    const { mode } = req.body;
    const { companyId } = req.user;
    const validModes = ["Light", "Dark", "Favicon"];
    console.log("|=============== storeLogo  ==============|", exports.storeLogo);
    if (validModes.indexOf(mode) === -1) {
        return res.status(406);
    }
    if (file && file.mimetype.startsWith("image/")) {
        const setting = await (0, UpdateSettingService_1.default)({
            key: `appLogo${mode}`,
            value: file.filename,
            companyId
        });
        return res.status(200).json(setting.value);
    }
    return res.status(406);
};
exports.storeLogo = storeLogo;
const storePrivateFile = async (req, res) => {
    const file = req.file;
    const { settingKey } = req.body;
    const { companyId } = req.user;
    console.log("|=============== storePrivateFile  ==============|", exports.storeLogo);
    const setting = await (0, UpdateSettingService_1.default)({
        key: `_${settingKey}`,
        value: file.filename,
        companyId
    });
    return res.status(200).json(setting.value);
};
exports.storePrivateFile = storePrivateFile;
const getWelcomeMedia = async (req, res) => {
    // const { companyId } = req.user;
    const mediaConfig = await (0, GetWelcomeMediaService_1.default)({});
    return res.status(200).json(mediaConfig);
};
exports.getWelcomeMedia = getWelcomeMedia;
const updateWelcomeMedia = async (req, res) => {
    // const { companyId } = req.user;
    const mediaData = req.body;
    if (req.user.profile !== "admin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    try {
        const mediaConfig = await (0, UpdateWelcomeMediaService_1.default)({
            mediaData,
            companyId: undefined
        });
        const io = (0, socket_1.getIO)();
        // Emitir para o namespace global
        io.of('/').emit("company-global-settings", {
            action: "update",
            setting: {
                key: "welcomeMediaConfig",
                value: JSON.stringify(mediaConfig)
            }
        });
        // Buscar todas as empresas e emitir para cada namespace
        const companies = await Company_2.default.findAll({
            attributes: ['id']
        });
        // Emitir para cada namespace de empresa
        for (const company of companies) {
            try {
                io.of(`/${company.id}`).emit("company-global-settings", {
                    action: "update",
                    setting: {
                        key: "welcomeMediaConfig",
                        value: JSON.stringify(mediaConfig)
                    }
                });
            }
            catch (error) {
                console.error(`Erro ao emitir para empresa ${company.id}:`, error);
            }
        }
        return res.status(200).json(mediaConfig);
    }
    catch (error) {
        console.error("Erro ao atualizar configurações de mídia:", error);
        throw new AppError_1.default("Erro ao atualizar configurações de mídia", 500);
    }
};
exports.updateWelcomeMedia = updateWelcomeMedia;
