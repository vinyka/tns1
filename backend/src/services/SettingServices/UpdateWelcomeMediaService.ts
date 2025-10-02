import Setting from "../../models/Setting";
import AppError from "../../errors/AppError";

interface MediaData {
  type: string;
  url: string;
  width: string;
}

interface Request {
  mediaData: MediaData;
  companyId: number;
}

interface Response {
  type: string;
  url: string;
  width: string;
}

const isValidUrl = (urlString: string): boolean => {
  try {
    // Para URLs de YouTube, aceitamos formatos comuns sem validar completamente
    if (urlString.includes('youtube.com') || urlString.includes('youtu.be')) {
      return true;
    }
    
    // Para outras URLs, tentamos criar um objeto URL
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

const UpdateWelcomeMediaService = async ({
  mediaData,
  companyId
}: Request): Promise<Response> => {
  try {
    const { type, url, width } = mediaData;

    if (!["image", "video", "youtube"].includes(type)) {
      throw new AppError("Tipo de mídia inválido. Use 'image', 'video' ou 'youtube'.", 400);
    }

    if (!url) {
      throw new AppError("URL da mídia é obrigatória.", 400);
    }

    if (type !== "youtube" && !isValidUrl(url)) {
      throw new AppError("URL inválida. Por favor, forneça uma URL completa e válida.", 400);
    }

    // Limitar o tamanho da URL para evitar problemas com o banco de dados
    if (url.length > 1000) {
      throw new AppError("URL muito longa. Limite de 1000 caracteres.", 400);
    }

    // Verificar se a largura fornecida é válida
    if (width && !width.match(/^\d+(%|px|em|rem|vh|vw)$|^auto$/)) {
      throw new AppError("Formato de largura inválido. Use valores como '50%', '300px', etc.", 400);
    }

    // Valores padrão seguros
    const safeWidth = width || "50%";
    
    // Buscar ou criar as configurações
    const [typeConfig] = await Setting.findOrCreate({
      where: { key: "welcomeMediaType" },
      defaults: { value: type }
    });

    const [urlConfig] = await Setting.findOrCreate({
      where: { key: "welcomeMediaUrl" },
      defaults: { value: url }
    });

    const [widthConfig] = await Setting.findOrCreate({
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
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    console.error("Erro ao atualizar configurações de mídia:", error);
    throw new AppError("Erro ao atualizar configurações de mídia. Por favor, tente novamente.", 500);
  }
};

export default UpdateWelcomeMediaService; 