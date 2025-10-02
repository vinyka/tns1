"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const path_2 = __importDefault(require("path"));
const name = process.env.GERENCIANET_SANDBOX === "false" ? "producao" : "homologacao";
const cert = path_2.default.join(__dirname, `../../certs/${process.env.GERENCIANET_PIX_CERT}.p12`);
module.exports = {
    sandbox: process.env.GERENCIANET_SANDBOX === "true",
    client_id: process.env.GERENCIANET_CLIENT_ID,
    client_secret: process.env.GERENCIANET_CLIENT_SECRET,
    pix_cert: cert
};
