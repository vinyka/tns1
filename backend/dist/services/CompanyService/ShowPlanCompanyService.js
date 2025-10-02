"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Company_2 = __importDefault(require("../../models/Company"));
const Plan_2 = __importDefault(require("../../models/Plan"));
const ShowPlanCompanyService = async (id) => {
    const companies = await Company_2.default.findOne({
        where: { id },
        attributes: ["id", "name", "email", "status", "dueDate", "createdAt", "phone", "document", "lastLogin"],
        order: [["name", "ASC"]],
        include: [
            {
                model: Plan_2.default, as: "plan",
                attributes: [
                    "id",
                    "name",
                    "users",
                    "connections",
                    "queues",
                    "amount",
                    "useWhatsapp",
                    "useFacebook",
                    "useInstagram",
                    "useCampaigns",
                    "useSchedules",
                    "useInternalChat",
                    "useExternalApi",
                    "useKanban",
                    "useOpenAi",
                    "useAudioTranscription",
                    "useIntegrations"
                ]
            },
        ]
    });
    return companies;
};
exports.default = ShowPlanCompanyService;
