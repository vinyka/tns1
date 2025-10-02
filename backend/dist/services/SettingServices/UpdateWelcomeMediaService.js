"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = __importDefault(require("../../models/Setting"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const isValidUrl = (urlString) => {
    try {
        // Para URLs de YouTube, aceitamos formatos comuns sem validar completamente
        if (urlString.includes('youtube.com') || urlString.includes('youtu.be')) {
            return true;
        }
        // Para outras URLs, tentamos criar um objeto URL
        new URL(urlString);
        return true;
    }
    catch (e) {
        return false;
    }
};
const UpdateWelcomeMediaService = async ({ mediaData, companyId }) => {
    try {
        const { type, url, width } = mediaData;
        if (!["image", "video", "youtube"].includes(type)) {
            throw new AppError_1.default("Tipo de mídia inválido. Use 'image', 'video' ou 'youtube'.", 400);
        }
        if (!url) {
            throw new AppError_1.default("URL da mídia é obrigatória.", 400);
        }
        if (type !== "youtube" && !isValidUrl(url)) {
            throw new AppError_1.default("URL inválida. Por favor, forneça uma URL completa e válida.", 400);
        }
        // Limitar o tamanho da URL para evitar problemas com o banco de dados
        if (url.length > 1000) {
            throw new AppError_1.default("URL muito longa. Limite de 1000 caracteres.", 400);
        }
        // Verificar se a largura fornecida é válida
        if (width && !width.match(/^\d+(%|px|em|rem|vh|vw)$|^auto$/)) {
            throw new AppError_1.default("Formato de largura inválido. Use valores como '50%', '300px', etc.", 400);
        }
        // Valores padrão seguros
        const safeWidth = width || "50%";
        // Buscar ou criar as configurações
        const [typeConfig] = await Setting_1.default.findOrCreate({
            where: { key: "welcomeMediaType" },
            defaults: { value: type }
        });
        const [urlConfig] = await Setting_1.default.findOrCreate({
            where: { key: "welcomeMediaUrl" },
            defaults: { value: url }
        });
        const [widthConfig] = await Setting_1.default.findOrCreate({
            where: { key: "welcomeMediaWidth" },
            defaults: { value: safeWidth }
        });
        // Atualizar valores
        await typeConfig.update({ value: type });
        await urlConfig.update({ value: url });
        await widthConfig.update({ value: safeWidth });
        return {
            type,
            url,
            width: safeWidth
        };
    }
    catch (error) {
        if (error instanceof AppError_1.default) {
            throw error;
        }
        console.error("Erro ao atualizar configurações de mídia:", error);
        throw new AppError_1.default("Erro ao atualizar configurações de mídia. Por favor, tente novamente.", 500);
    }
};
exports.default = UpdateWelcomeMediaService;
