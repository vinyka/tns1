"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Company_1 = __importDefault(require("../../models/Company"));
const Plan_1 = __importDefault(require("../../models/Plan"));
const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
const formatBytes = (bytes) => {
    if (bytes === 0) {
        return "0 B";
    }
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${sizes[i]}`;
};
const collectFolderStats = async (dir) => {
    try {
        const entries = await fs_1.default.promises.readdir(dir, { withFileTypes: true });
        let totalSize = 0;
        let filesCount = 0;
        let lastModified;
        await Promise.all(entries.map(async (entry) => {
            const fullPath = path_1.default.join(dir, entry.name);
            const stats = await fs_1.default.promises.stat(fullPath);
            if (stats.isDirectory()) {
                const nested = await collectFolderStats(fullPath);
                totalSize += nested.size;
                filesCount += nested.files;
                if (!lastModified || (nested.lastModified && nested.lastModified > lastModified)) {
                    lastModified = nested.lastModified;
                }
            }
            else {
                totalSize += stats.size;
                filesCount += 1;
                if (!lastModified || stats.mtimeMs > lastModified) {
                    lastModified = stats.mtimeMs;
                }
            }
        }));
        return { size: totalSize, files: filesCount, lastModified };
    }
    catch (error) {
        if (error?.code === "ENOENT") {
            return { size: 0, files: 0 };
        }
        throw error;
    }
};
const ListCompaniesPlanService = async () => {
    const companies = await Company_1.default.findAll({
        attributes: [
            "id",
            "name",
            "email",
            "status",
            "dueDate",
            "createdAt",
            "phone",
            "document",
            "lastLogin",
            "folderSize",
            "numberFileFolder",
            "updatedAtFolder"
        ],
        order: [["id", "ASC"]],
        include: [
            {
                model: Plan_1.default,
                as: "plan",
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
                    "useIntegrations"
                ]
            }
        ]
    });
    const enrichedCompanies = await Promise.all(companies.map(async (company) => {
        const companyFolder = path_1.default.join(publicFolder, `company${company.id}`);
        const { size, files, lastModified } = await collectFolderStats(companyFolder);
        const plain = company.toJSON();
        plain.folderSize = formatBytes(size);
        plain.numberFileFolder = files.toString();
        if (lastModified) {
            plain.updatedAtFolder = new Date(lastModified).toISOString();
        }
        return plain;
    }));
    return enrichedCompanies;
};
exports.default = ListCompaniesPlanService;
