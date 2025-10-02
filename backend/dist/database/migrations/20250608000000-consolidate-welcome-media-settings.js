"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        // 1. Primeiro, obter as configurações mais recentes da empresa 1 (se existirem)
        const companySettings = await queryInterface.sequelize.query(`SELECT * FROM "Settings" 
       WHERE key LIKE 'welcomeMedia%' 
       AND "companyId" = 1 
       ORDER BY "updatedAt" DESC 
       LIMIT 3`, { type: sequelize_1.QueryTypes.SELECT });
        // 2. Obter configurações globais atuais
        const globalSettings = await queryInterface.sequelize.query(`SELECT * FROM "Settings" 
       WHERE key LIKE 'welcomeMedia%' 
       AND "companyId" IS NULL`, { type: sequelize_1.QueryTypes.SELECT });
        // 3. Determinar quais valores usar para as configurações globais
        // Se existirem configurações da empresa 1, usar esses valores
        // Caso contrário, manter as configurações globais existentes ou usar valores padrão
        const defaultValues = {
            welcomeMediaType: "image",
            welcomeMediaUrl: "https://i.imgur.com/ZCODluy.png",
            welcomeMediaWidth: "50%"
        };
        const settingsMap = {};
        // Adicionar valores padrão
        Object.entries(defaultValues).forEach(([key, value]) => {
            settingsMap[key] = value;
        });
        // Sobrescrever com valores das configurações globais existentes (se houver)
        globalSettings.forEach(setting => {
            settingsMap[setting.key] = setting.value;
        });
        // Sobrescrever com valores das configurações da empresa 1 (se houver)
        companySettings.forEach(setting => {
            settingsMap[setting.key] = setting.value;
        });
        // 4. Remover todas as configurações existentes (globais e específicas por empresa)
        await queryInterface.bulkDelete("Settings", {
            key: {
                [sequelize_1.Op.like]: "welcomeMedia%"
            }
        });
        // 5. Criar as novas configurações globais unificadas
        const newSettings = Object.entries(settingsMap).map(([key, value]) => ({
            key,
            value,
            companyId: null,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        await queryInterface.bulkInsert("Settings", newSettings);
    },
    down: async (queryInterface) => {
        // Não é possível restaurar precisamente o estado anterior
        // já que estamos consolidando várias migrações
    }
};
