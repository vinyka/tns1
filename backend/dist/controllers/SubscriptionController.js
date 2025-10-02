"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhook = exports.deleteWebhook = exports.createWebhook = exports.createSubscription = exports.index = void 0;
const Yup = __importStar(require("yup"));
const gn_api_sdk_typescript_1 = __importDefault(require("gn-api-sdk-typescript"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const Gn_1 = __importDefault(require("../config/Gn"));
const Company_2 = __importDefault(require("../models/Company"));
const Invoices_1 = __importDefault(require("../models/Invoices"));
const socket_1 = require("../libs/socket");
const Plan_2 = __importDefault(require("../models/Plan"));
const index = async (req, res) => {
    const gerencianet = new gn_api_sdk_typescript_1.default(Gn_1.default);
    return res.json(gerencianet.getSubscriptions());
};
exports.index = index;
const createSubscription = async (req, res) => {
    const gerencianet = new gn_api_sdk_typescript_1.default(Gn_1.default);
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        price: Yup.string().required(),
        users: Yup.string().required(),
        plan: Yup.string().required()
    });
    if (!(await schema.isValid(req.body))) {
        throw new AppError_1.default("Validation fails", 400);
    }
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });
    const updateCompany = await Company_2.default.findOne({ where: { id: companyId } });
    const plan = await Plan_2.default.findOne({ where: { id: updateCompany.planId } });
    const { invoiceId } = req.body;
    const _price = plan.amount;
    // const price: any = _price.toLocaleString("us-US", { minimumFractionDigits: 2 }).replace(",", ".")
    const price = formatter.format(_price).replace('$', '');
    const devedor = { nome: updateCompany.name };
    const doc = updateCompany.document.replace(/\D/g, "");
    if (doc.length === 11) {
        devedor.cpf = doc;
    }
    else {
        devedor.cnpj = doc;
    }
    const body = {
        calendario: {
            expiracao: 3600
        },
        devedor: {
            ...devedor
        },
        valor: {
            original: price
        },
        chave: process.env.GERENCIANET_CHAVEPIX,
        solicitacaoPagador: `#Fatura:${invoiceId}`
    };
    try {
        const pix = await gerencianet.pixCreateImmediateCharge(null, body);
        const qrcode = await gerencianet.pixGenerateQRCode({ id: pix.loc.id });
        if (!updateCompany) {
            throw new AppError_1.default("Company not found", 404);
        }
        // await updateCompany.update({
        //   name: firstName,
        //   document: zipcode,
        //   planId: plan.planId,
        // });
        return res.json({
            ...pix,
            qrcode
        });
    }
    catch (error) {
        console.log('error_subscription', error);
        throw new AppError_1.default("Validation fails", 400);
    }
};
exports.createSubscription = createSubscription;
const createWebhook = async (req, res) => {
    const schema = Yup.object().shape({
        chave: Yup.string().required(),
        url: Yup.string().required()
    });
    if (!(await schema.isValid(req.body))) {
        throw new AppError_1.default("Validation fails", 400);
    }
    const { chave, url } = req.body;
    const body = {
        webhookUrl: url
    };
    const params = {
        chave
    };
    try {
        const gerencianet = new gn_api_sdk_typescript_1.default(Gn_1.default);
        const create = await gerencianet.pixConfigWebhook(params, body);
        // const params1 = {
        //   inicio: '2022-12-20T00:01:35Z',
        //   fim: '2022-12-31T23:59:00Z',
        // };
        // const pixListWebhook = await gerencianet.pixListWebhook(params1);
        // const params2 = {
        //   chave: 'c5c0f5a4-efe2-447f-8c73-55f8c0f07284',
        // };
        // const pixDetailWebhook = await gerencianet.pixDetailWebhook(params2);
        return res.json(create);
    }
    catch (error) {
        console.log(error);
    }
};
exports.createWebhook = createWebhook;
const deleteWebhook = async (req, res) => {
    const schema = Yup.object().shape({
        chave: Yup.string().required()
    });
    if (!(await schema.isValid(req.body))) {
        throw new AppError_1.default("Validation fails", 400);
    }
    const { chave } = req.body;
    const params = {
        chave
    };
    const gerencianet = new gn_api_sdk_typescript_1.default(Gn_1.default);
    const deleteWebhook = await gerencianet.pixDeleteWebhook(params);
    return res.json(deleteWebhook);
};
exports.deleteWebhook = deleteWebhook;
const webhook = async (req, res) => {
    const { type } = req.params;
    const { evento } = req.body;
    if (evento === "teste_webhook") {
        return res.json({ ok: true });
    }
    if (req.body.pix) {
        const gerencianet = new gn_api_sdk_typescript_1.default(Gn_1.default);
        req.body.pix.forEach(async (pix) => {
            const detalhe = await gerencianet.pixDetailCharge({ txid: pix.txid });
            if (detalhe.status === "CONCLUIDA") {
                const { solicitacaoPagador } = detalhe;
                const invoiceID = solicitacaoPagador.replace("#Fatura:", "");
                const invoices = await Invoices_1.default.findByPk(invoiceID);
                const companyId = invoices.companyId;
                const company = await Company_2.default.findByPk(companyId);
                const expiresAt = new Date(company.dueDate);
                expiresAt.setDate(expiresAt.getDate() + 30);
                const date = expiresAt.toISOString().split("T")[0];
                if (company) {
                    await company.update({
                        dueDate: date
                    });
                    const invoi = await invoices.update({
                        id: invoiceID,
                        status: 'paid'
                    });
                    await company.reload();
                    const io = (0, socket_1.getIO)();
                    const companyUpdate = await Company_2.default.findOne({
                        where: {
                            id: companyId
                        }
                    });
                    io.of(String(companyId))
                        .emit(`company-${companyId}-payment`, {
                        action: detalhe.status,
                        company: companyUpdate
                    });
                }
            }
        });
    }
    return res.json({ ok: true });
};
exports.webhook = webhook;
