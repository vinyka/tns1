import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import GetDefaultWhatsAppByUser from "./GetDefaultWhatsAppByUser"

export const GetWhatsApp = async (
  whatsappId?: number,
  companyId: number | null = null,
  userId?: number
): Promise<Whatsapp> => {
  let connection: Whatsapp | null = null;

  console.log({ whatsappId, companyId, userId });

  if (whatsappId) {
    connection = await Whatsapp.findOne({
      where: { id: whatsappId, companyId }
    });
  } else {
    connection = await Whatsapp.findOne({
      where: { status: "CONNECTED", companyId, isDefault: true }
    });
  }

  if (!connection || connection.status !== 'CONNECTED') {
    connection = await Whatsapp.findOne({
      where: { status: "CONNECTED", companyId }
    });
  }

  if (userId) {
    const whatsappByUser  = await GetDefaultWhatsAppByUser (userId);
    if (whatsappByUser  && whatsappByUser .status === 'CONNECTED') {
      connection = whatsappByUser ;
    }
  }

  if (!connection) {
    throw new AppError(`No default WhatsApp found for company ${companyId}.`);
  }

  return connection;
};