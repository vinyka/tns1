import React, { useEffect, useState, useContext } from "react";
import QRCode from "qrcode.react";
import toastError from "../../errors/toastError";
import { makeStyles } from "@material-ui/core/styles";
import { Dialog, DialogContent, Paper, Typography } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";

import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  qrWrapper: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  instructions: {
    marginTop: theme.spacing(3),
    maxWidth: 360,
    color: theme.palette.text.secondary,
  },
  instructionsList: {
    margin: theme.spacing(1, 0, 0),
    paddingLeft: theme.spacing(3),
  },
}));

const QrcodeModal = ({ open, onClose, whatsAppId }) => {
  const classes = useStyles();
  const [qrCode, setQrCode] = useState("");
  const { user, socket } = useContext(AuthContext);

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        const { data } = await api.get(`/whatsapp/${whatsAppId}`);
        setQrCode(data.qrcode);
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  useEffect(() => {
    if (!whatsAppId) return;
    const companyId = user.companyId;
    // const socket = socketConnection({ companyId, userId: user.id });

    const onWhatsappData = (data) => {
      if (data.action === "update" && data.session.id === whatsAppId) {
        setQrCode(data.session.qrcode);
      }

      if (data.action === "update" && data.session.qrcode === "") {
        onClose();
      }
    }
    socket.on(`company-${companyId}-whatsappSession`, onWhatsappData);

    return () => {
      socket.off(`company-${companyId}-whatsappSession`, onWhatsappData);
    };
  }, [whatsAppId, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" scroll="paper">
      <DialogContent>
        <Paper elevation={0}>
          <Typography color="secondary" gutterBottom>
            {i18n.t("qrCode.message")}
          </Typography>
          <div className={classes.qrWrapper}>
            {qrCode ? (
              <QRCode value={qrCode} size={300} style={{ backgroundColor: "white", padding: '5px' }} />
            ) : (
              <span>Aguardando pelo QR Code</span>
            )}
          </div>
          <div className={classes.instructions}>
            <Typography variant="subtitle2" color="textPrimary">
              {i18n.t("qrCode.instructions.title")}
            </Typography>
            <ol className={classes.instructionsList}>
              <li>{i18n.t("qrCode.instructions.step1")}</li>
              <li>{i18n.t("qrCode.instructions.step2")}</li>
              <li>{i18n.t("qrCode.instructions.step3")}</li>
              <li>{i18n.t("qrCode.instructions.step4")}</li>
            </ol>
          </div>
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(QrcodeModal);
