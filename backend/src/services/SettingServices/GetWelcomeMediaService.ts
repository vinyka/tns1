import Setting from "../../models/Setting";

interface Request {
  companyId: number;
}

interface Response {
  type: string;
  url: string;
  width: string;
}

const GetWelcomeMediaService = async ({
  companyId
}: Request): Promise<Response> => {
  const type = await Setting.findOne({
    where: {
      key: "welcomeMediaType",
      companyId: null
    }
  });

  const url = await Setting.findOne({
    where: {
      key: "welcomeMediaUrl",
      companyId: null
    }
  });

  const width = await Setting.findOne({
    where: {
      key: "welcomeMediaWidth",
      companyId: null
    }
  });

  return {
    type: type?.value || "image",
    url: url?.value || "https://i.imgur.com/ZCODluy.png",
    width: width?.value || "50%"
  };
};

export default GetWelcomeMediaService; 