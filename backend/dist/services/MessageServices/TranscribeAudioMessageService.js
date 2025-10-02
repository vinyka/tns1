"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_2 = __importDefault(require("fs"));
const path_2 = __importDefault(require("path"));
const form_data_1 = __importDefault(require("form-data"));
const axios_1 = __importDefault(require("axios"));
const Setting_1 = __importDefault(require("../../models/Setting"));
const Company_2 = __importDefault(require("../../models/Company"));
const Plan_2 = __importDefault(require("../../models/Plan"));
async function fetchOpenAIToken(companyId) {
    try {
        // tenta pela empresa atual
        let setting = await Setting_1.default.findOne({
            where: { companyId, key: "openaikeyaudio" }
        });
        // fallback para empresa master (1)
        if (!setting && companyId !== 1) {
            setting = await Setting_1.default.findOne({
                where: { companyId: 1, key: "openaikeyaudio" }
            });
        }
        return setting?.value || null;
    }
    catch (error) {
        console.error("Error retrieving settings:", error);
        return null;
    }
}
const TranscribeAudioMessageToText = async (fileName, companyId) => {
    // verifica se o plano da empresa permite o recurso
    try {
        const company = await Company_2.default.findByPk(companyId);
        if (!company) {
            return "Empresa não encontrada";
        }
        const plan = await Plan_2.default.findByPk(company.planId);
        if (!plan || plan.useAudioTranscription === false) {
            return "Recurso de transcrição de áudio não habilitado no plano da empresa.";
        }
    }
    catch (e) {
        console.error("Erro ao verificar plano/useAudioTranscription", e);
        return "Falha ao verificar permissões do plano para transcrição de áudio";
    }
    const token = await fetchOpenAIToken(companyId);
    if (!token)
        return "Token OpenAI não configurado (setting 'openaikeyaudio').";
    const publicFolder = path_2.default.resolve(__dirname, "..", "..", "..", "public");
    const filePath = `${publicFolder}/company${companyId}/${fileName}`;
    if (!fs_2.default.existsSync(filePath)) {
        console.error(`Arquivo não encontrado: ${filePath}`);
        return "Arquivo não encontrado";
    }
    try {
        const audioFile = fs_2.default.createReadStream(filePath);
        const form = new form_data_1.default();
        form.append("file", audioFile);
        form.append("model", "whisper-1");
        form.append("response_format", "text");
        form.append("language", "pt");
        const response = await axios_1.default.post("https://api.openai.com/v1/audio/transcriptions", form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        return { transcribedText: response.data };
    }
    catch (error) {
        // Melhorar logging e retorno de erro para diagnóstico
        if (axios_1.default.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;
            console.error("OpenAI transcription error:", status, data || error.message);
            if (data?.error?.message) {
                return `Falha na API OpenAI: ${data.error.message}`;
            }
            return `Falha na API OpenAI${status ? ` (status ${status})` : ""}`;
        }
        console.error(error);
        return "Conversão pra texto falhou";
    }
};
exports.default = TranscribeAudioMessageToText;
