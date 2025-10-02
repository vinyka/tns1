import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import ListSettingsServiceOne from "../services/SettingServices/ListSettingsServiceOne";
import GetSettingService from "../services/SettingServices/GetSettingService";
import UpdateOneSettingService from "../services/SettingServices/UpdateOneSettingService";
import GetPublicSettingService from "../services/SettingServices/GetPublicSettingService";
import GetWelcomeMediaService from "../services/SettingServices/GetWelcomeMediaService";
import UpdateWelcomeMediaService from "../services/SettingServices/UpdateWelcomeMediaService";
import Company from "../models/Company";
import { Sequelize } from "sequelize";

type LogoRequest = {
  mode: string;
};

type PrivateFileRequest = {
  settingKey: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  // if (req.user.profile !== "admin") {
  //   throw new AppError("ERR_NO_PERMISSION", 403);
  // }

  const settings = await ListSettingsService({ companyId });

  return res.status(200).json(settings);
};

export const showOne = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { settingKey: key } = req.params;

  console.log("|======== GetPublicSettingService ========|")
  console.log("key", key)
  console.log("|=========================================|")

  
  const settingsTransfTicket = await ListSettingsServiceOne({ companyId: companyId, key: key });

  return res.status(200).json(settingsTransfTicket);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {

  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { settingKey: key } = req.params;
  const { value } = req.body;
  const { companyId } = req.user;

  const setting = await UpdateSettingService({
    key,
    value,
    companyId
  });

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-settings`, {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};

export const getSetting = async (
  req: Request,
  res: Response): Promise<Response> => {

  const { settingKey: key } = req.params;

  const setting = await GetSettingService({ key });

  return res.status(200).json(setting);

}

export const updateOne = async (
  req: Request,
  res: Response
): Promise<Response> => {

  const { settingKey: key } = req.params;
  const { value } = req.body;

  const setting = await UpdateOneSettingService({
    key,
    value
  });

  return res.status(200).json(setting); 
};

export const publicShow = async (req: Request, res: Response): Promise<Response> => {
  console.log("|=============== publicShow  ==============|")
  
  const { settingKey: key } = req.params;
  
  const settingValue = await GetPublicSettingService({ key });


  return res.status(200).json(settingValue);
};

export const storeLogo = async (req: Request, res: Response): Promise<Response> => {
  const file = req.file as Express.Multer.File;
  const { mode }: LogoRequest = req.body;
  const { companyId } = req.user;
  const validModes = [ "Light", "Dark", "Favicon" ];

  console.log("|=============== storeLogo  ==============|", storeLogo)

  if ( validModes.indexOf(mode) === -1 ) {
    return res.status(406);
  }

  if (file && file.mimetype.startsWith("image/")) {
    
    const setting = await UpdateSettingService({
      key: `appLogo${mode}`,
      value: file.filename,
      companyId
    });
    
    return res.status(200).json(setting.value);
  }
  
  return res.status(406);
}

export const storePrivateFile = async (req: Request, res: Response): Promise<Response> => {
  const file = req.file as Express.Multer.File;
  const { settingKey }: PrivateFileRequest = req.body;
  const { companyId } = req.user;


  console.log("|=============== storePrivateFile  ==============|", storeLogo)

  const setting = await UpdateSettingService({
    key: `_${settingKey}`,
    value: file.filename,
    companyId
  });
  
  return res.status(200).json(setting.value);
}

export const getWelcomeMedia = async (req: Request, res: Response): Promise<Response> => {
  // const { companyId } = req.user;

  const mediaConfig = await GetWelcomeMediaService({} as any);

  return res.status(200).json(mediaConfig);
};

export const updateWelcomeMedia = async (req: Request, res: Response): Promise<Response> => {
  // const { companyId } = req.user;
  const mediaData = req.body;

  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  try {
    const mediaConfig = await UpdateWelcomeMediaService({
      mediaData,
      companyId: undefined as any
    });

    const io = getIO();
    
    // Emitir para o namespace global
    io.of('/').emit("company-global-settings", {
      action: "update",
      setting: {
        key: "welcomeMediaConfig",
        value: JSON.stringify(mediaConfig)
      }
    });

    // Buscar todas as empresas e emitir para cada namespace
    const companies = await Company.findAll({
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
      } catch (error) {
        console.error(`Erro ao emitir para empresa ${company.id}:`, error);
      }
    }

    return res.status(200).json(mediaConfig);
  } catch (error) {
    console.error("Erro ao atualizar configurações de mídia:", error);
    throw new AppError("Erro ao atualizar configurações de mídia", 500);
  }
};
