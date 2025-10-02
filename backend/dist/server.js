"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_graceful_shutdown_1 = __importDefault(require("http-graceful-shutdown"));
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./libs/socket");
const logger_1 = __importDefault(require("./utils/logger"));
const StartAllWhatsAppsSessions_1 = require("./services/WbotServices/StartAllWhatsAppsSessions");
const Company_2 = __importDefault(require("./models/Company"));
const queue_1 = __importDefault(require("./libs/queue"));
const queues_1 = require("./queues");
// import { ScheduledMessagesJob, ScheduleMessagesGenerateJob, ScheduleMessagesEnvioJob, ScheduleMessagesEnvioForaHorarioJob } from "./wbotScheduledMessages";
const server = app_1.default.listen(process.env.PORT, async () => {
    const companies = await Company_2.default.findAll({
        where: { status: true },
        attributes: ["id"]
    });
    const allPromises = [];
    companies.map(async (c) => {
        const promise = (0, StartAllWhatsAppsSessions_1.StartAllWhatsAppsSessions)(c.id);
        allPromises.push(promise);
    });
    Promise.all(allPromises).then(async () => {
        await (0, queues_1.startQueueProcess)();
    });
    if (process.env.REDIS_URI_ACK && process.env.REDIS_URI_ACK !== '') {
        queue_1.default.process();
    }
    logger_1.default.info(`Server started on port: ${process.env.PORT}`);
});
process.on("uncaughtException", err => {
    console.error(`${new Date().toUTCString()} uncaughtException:`, err.message);
    console.error(err.stack);
    process.exit(1);
});
process.on("unhandledRejection", (reason, p) => {
    console.error(`${new Date().toUTCString()} unhandledRejection:`, reason, p);
    process.exit(1);
});
// cron.schedule("* * * * * *", async () => {
//   try {
//     // console.log("Running a job at 5 minutes at America/Sao_Paulo timezone")
//     await ScheduledMessagesJob();
//     await ScheduleMessagesGenerateJob();
//   }
//   catch (error) {
//     logger.error(error);
//   }
// });
// cron.schedule("* * * * * *", async () => {
//   try {
//     // console.log("Running a job at 01:00 at America/Sao_Paulo timezone")
//     console.log("Running a job at 2 minutes at America/Sao_Paulo timezone")
//     await ScheduleMessagesEnvioJob();
//     await ScheduleMessagesEnvioForaHorarioJob()
//   }
//   catch (error) {
//     logger.error(error);
//   }
// });
(0, socket_1.initIO)(server);
(0, http_graceful_shutdown_1.default)(server);
