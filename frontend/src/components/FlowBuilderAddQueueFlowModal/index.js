import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Stack } from "@mui/material";
import { toast } from "react-toastify";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexWrap: "wrap"
    },
    buttonProgress: {
        color: green[500],
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop: -12,
        marginLeft: -12
    }
}));

const FlowBuilderAddQueueFlowModal = ({
    open,
    onSave,
    data,
    onUpdate,
    close
}) => {
    const classes = useStyles();
    const { user } = useContext(AuthContext);
    const { companyId } = user;

    const [flows, setFlows] = useState([]);
    const [selectedFlow, setFlowSelected] = useState("");
    const [loading, setLoading] = useState(false);
    const [dataItemError, setDataItemError] = useState({ flowId: false });

    useEffect(() => {
        const fetchFlows = async () => {
            setLoading(true);
            try {
                const { data: responseData } = await api.get("/flowbuilder");
                console.log("Fluxos carregados:", responseData.flows); // Debugging
                setFlows(responseData.flows);
                if (open === 'edit' && data) {
                    const flow = responseData.flows.find(item => item.id === data.data.id);
                    if (flow) {
                        setFlowSelected(flow.id);
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar os fluxos:", error); // Debugging
                toast.error("Erro ao carregar os fluxos.");
            } finally {
                setLoading(false);
            }
        };

        if (open === 'edit' || open === 'create') {
            fetchFlows();
        }
    }, [open, data]);

    const handleClose = () => {
        close(null);
        clearErrors();
    };

    const clearErrors = () => {
        setDataItemError({ flowId: false });
    };

    const handleSaveContact = async () => {
        if (!selectedFlow) {
            setDataItemError(old => ({ ...old, flowId: true }));
            return toast.error('Selecione um fluxo');
        }

        const flow = flows.find (item => item.id === selectedFlow);
        if (!flow) {
            return toast.error('Fluxo selecionado não encontrado.');
        }

        try {
            if (open === 'edit') {
                await onUpdate({ ...data, data: flow });
                toast.success("Fluxo editado com sucesso!");
            } else if (open === 'create') {
                await onSave({ data: flow });
                toast.success("Fluxo criado com sucesso!");
            }
            handleClose();
        } catch (error) {
            console.error("Erro ao salvar o fluxo:", error); // Debugging
            toast.error("Erro ao salvar o fluxo.");
        }
    };

    return (
        <div className={classes.root}>
            <Dialog open={open} onClose={handleClose} fullWidth="md" scroll="paper">
                <DialogTitle id="form-dialog-title">
                    {open === 'create' ? `Adicionar um ticket ao fluxo` : `Editar Ticket`}
                </DialogTitle>
                <Stack sx={{ padding: "52px" }}>
                    <Stack sx={{ gap: "14px" }}>
                        <Typography>Escolha um fluxo</Typography>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={selectedFlow}
                            error={dataItemError.flowId}
                            onChange={(e) => { setFlowSelected(e.target.value) }}
                            MenuProps={{
                                anchorOrigin: {
                                    vertical: "bottom",
                                    horizontal: "left",
                                },
                                transformOrigin: {
                                    vertical: "top",
                                    horizontal: "left",
                                },
                                getContentAnchorEl: null,
                            }}
                            renderValue={() => {
                                if (selectedFlow === "") {
                                    return "Selecione uma Conexão"
                                }
                                const flow = flows.find(w => w.id === selectedFlow)
                                return flow ? flow.name : "";
                            }}
                        >
                            {flows.length > 0 && (
                                flows.map((flow, index) => (
                                    <MenuItem dense key={index} value={flow.id}>{flow.name}</MenuItem>
                                ))
                            )}
                        </Select>
                    </Stack>
                    <Stack
                        direction={"row"}
                        spacing={2}
                        alignSelf={"end"}
                        marginTop={"16px"}
                    >
                        <Button
                            variant="outlined"
                            onClick={handleClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSaveContact}
                        >
                            {open === 'create' ? `Adicionar` : 'Editar'}
                        </Button>
                    </Stack>
                </Stack>
                {loading && (
                    <Stack
                        justifyContent={"center"}
                        alignItems={"center"}
                        minHeight={"10vh"}
                        sx={{ padding: "52px" }}
                    >
                        <CircularProgress />
                    </Stack>
                )}
            </Dialog>
        </div>
    );
};

export default FlowBuilderAddQueueFlowModal;