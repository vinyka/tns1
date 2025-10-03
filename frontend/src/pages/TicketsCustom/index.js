import React, { useState, useCallback, useContext, useEffect, useRef } from "react";
import { useParams, useHistory } from "react-router-dom";
import Paper from "@material-ui/core/Paper";
import Hidden from "@material-ui/core/Hidden";
import { makeStyles } from "@material-ui/core/styles";
import TicketsManager from "../../components/TicketsManagerTabs";
import Ticket from "../../components/Ticket";

import { QueueSelectedProvider } from "../../context/QueuesSelected/QueuesSelectedContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import { CircularProgress } from "@material-ui/core";
import { getBackendUrl } from "../../config";
import logo from "../../assets/logo.png";
import logoDark from "../../assets/logo-black.png";

	// Link original que será mantido como referência
	const defaultBackgroundImageUrl = "https://i.imgur.com/ZCODluy.png";

const defaultTicketsManagerWidth = 550;
const minTicketsManagerWidth = 404;
const maxTicketsManagerWidth = 700;

const useStyles = makeStyles((theme) => ({
	chatContainer: {
		flex: 1,
		padding: "2px",
		height: `calc(100% - 48px)`,
		overflowY: "hidden",
	},
	chatPapper: {
		display: "flex",
		height: "100%",
	},
	contactsWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		overflowY: "hidden",
		position: "relative",
	},
	messagesWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		flexGrow: 1,
	},
	welcomeMsg: {
		background: theme.palette.tabHeaderBackground,
		display: "flex",
		justifyContent: "space-evenly",
		alignItems: "center",
		height: "100%",
		textAlign: "center",
		flexDirection: "column",
	},
	dragger: {
		width: "5px",
		cursor: "ew-resize",
		padding: "4px 0 0",
		borderTop: "1px solid #ddd",
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		zIndex: 100,
		backgroundColor: "#f4f7f9",
		userSelect: "none", // Evita a seleção de texto no elemento de redimensionamento
	},
	logo: {
		logo: theme.logo,
		content: "url(" + (theme.mode === "light" ? theme.calculatedLogoLight() : theme.calculatedLogoDark()) + ")"
	},
	mediaContainer: {
		width: '100%',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'column',
		padding: '20px',
		height: '100%',
		overflow: 'hidden',
	},
	youtubeContainer: {
		position: 'relative',
		paddingTop: '56.25%', // Proporção 16:9
		borderRadius: '8px',
		overflow: 'hidden',
		maxWidth: '100%',
		width: '100%',
	},
	youtubeIframe: {
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		border: 'none',
	},
	welcomeImage: {
		maxWidth: '100%',
		height: 'auto',
		maxHeight: '70vh',
		objectFit: 'contain',
		borderRadius: '8px',
	},
	welcomeVideo: {
		maxWidth: '100%',
		maxHeight: '70vh',
		borderRadius: '8px',
		objectFit: 'contain',
	},
	welcomeMessage: {
		marginTop: '40px',
		maxWidth: '600px',
		textAlign: 'center',
		width: '100%'
	}
}));



const TicketsCustom = () => {
	const { user, socket } = useContext(AuthContext);

	const classes = useStyles({ ticketsManagerWidth: user.defaultTicketsManagerWidth || defaultTicketsManagerWidth });

	const { ticketId } = useParams();

	const [ticketsManagerWidth, setTicketsManagerWidth] = useState(0);
	const ticketsManagerWidthRef = useRef(ticketsManagerWidth);
		const [mediaConfig, setMediaConfig] = useState({
			type: 'image', // 'image' ou 'video'
			url: defaultBackgroundImageUrl,
			width: '50%'
		});

	useEffect(() => {
		if (user && user.defaultTicketsManagerWidth) {
			setTicketsManagerWidth(user.defaultTicketsManagerWidth);
		}
	}, [user]);

		useEffect(() => {
			const fetchMediaConfig = async () => {
				try {
					const { data } = await api.get('/settings/welcome-media');
					if (data && data.url) {
						setMediaConfig(prevConfig => ({
							...prevConfig,
							...data
						}));
					}
				} catch (error) {
					console.error("Erro ao buscar configuração de mídia:", error);
				}
			};

			fetchMediaConfig();
		}, []);

	useEffect(() => {
		if (!socket) return;
		const onSettingsEvent = (data) => {
			if (data.action === "update" && data.setting?.key === "welcomeMediaConfig") {
				try {
					const config = JSON.parse(data.setting.value);
					setMediaConfig(prevConfig => ({ ...prevConfig, ...config }));
				} catch (e) {
					console.error("Erro ao atualizar mídia de boas-vindas via socket:", e);
				}
			}
		};
		socket.on("company-global-settings", onSettingsEvent);
		return () => {
			socket.off("company-global-settings", onSettingsEvent);
		};
	}, [socket]);

	// useEffect(() => {
	// 	if (ticketId && currentTicket.uuid === undefined) {
	// 		history.push("/tickets");
	// 	}
	// }, [ticketId, currentTicket.uuid, history]);

	const handleMouseDown = (e) => {
		document.addEventListener("mouseup", handleMouseUp, true);
		document.addEventListener("mousemove", handleMouseMove, true);
	};
	const handleSaveContact = async value => {
		if (value < 404)
			value = 404
		await api.put(`/users/toggleChangeWidht/${user.id}`, { defaultTicketsManagerWidth: value });

	}
	const handleMouseMove = useCallback(
		(e) => {
			const newWidth = e.clientX - document.body.offsetLeft;
			if (
				newWidth > minTicketsManagerWidth &&
				newWidth < maxTicketsManagerWidth
			) {
				ticketsManagerWidthRef.current = newWidth;
				setTicketsManagerWidth(newWidth);
			}
		},
		[]
	);

	const handleMouseUp = async () => {
		document.removeEventListener("mouseup", handleMouseUp, true);
		document.removeEventListener("mousemove", handleMouseMove, true);

		const newWidth = ticketsManagerWidthRef.current;

		if (newWidth !== ticketsManagerWidth) {
			await handleSaveContact(newWidth);
		}
	};

		// Renderiza mídia baseada na configuração
		const renderMedia = () => {
			if (!mediaConfig.url) return null;
			
			// Definir estilo baseado na largura configurada pelo usuário
			const containerStyle = {
				width: mediaConfig.width || '50%',
				maxWidth: '100%',
			};
			
			if (mediaConfig.type === "youtube") {
				// Extrair ID do vídeo do YouTube a partir da URL
				const getYoutubeVideoId = (url) => {
					// Tenta diferentes formatos de URL do YouTube
					const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
					const match = url.match(regExp);
					return (match && match[2].length === 11) ? match[2] : null;
				};
				
				const videoId = getYoutubeVideoId(mediaConfig.url);
				if (!videoId) return <div>URL do YouTube inválida</div>;
				
				return (
					<div className={classes.youtubeContainer} style={containerStyle}>
						<iframe 
							className={classes.youtubeIframe}
							src={`https://www.youtube.com/embed/${videoId}`}
							title="YouTube video player" 
							frameBorder="0" 
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
							allowFullScreen
						/>
					</div>
				);
			} else if (mediaConfig.type === "video") {
				return (
					<video 
						className={classes.welcomeVideo}
						src={mediaConfig.url}
						style={{ 
							width: mediaConfig.width || '50%',
							maxWidth: '100%'
						}}
						controls
						autoPlay
						muted
						loop
					/>
				);
			} else {
				return (
					<img 
						className={classes.welcomeImage}
						src={`${mediaConfig.url}?v=${Date.now()}`}
						style={{ 
							width: mediaConfig.width || '50%',
							maxWidth: '100%'
						}}
						alt="Imagem de boas-vindas" 
					/>
				);
			}
		};

	return (
		<QueueSelectedProvider>
			<div className={classes.chatContainer}>
				<div className={classes.chatPapper}>
					<div
						className={classes.contactsWrapper}
						style={{ width: ticketsManagerWidth }}
					>
						<TicketsManager />
						<div onMouseDown={e => handleMouseDown(e)} className={classes.dragger} />
					</div>
					<div className={classes.messagesWrapper}>
						{ticketId ? (
							<>
								{/* <Suspense fallback={<CircularProgress />}> */}
								<Ticket />
								{/* </Suspense> */}
							</>
						) : (
							<Hidden only={["sm", "xs"]}>
								<Paper square variant="outlined" className={classes.welcomeMsg}>
									<div className={classes.welcomeMessage}>
										{i18n.t("chat.noTicketMessage")}
									</div>
									<div className={classes.mediaContainer}>
										{renderMedia()}
									</div>
								</Paper>
							</Hidden>
						)}
					</div>
				</div>
			</div>
		</QueueSelectedProvider>
	);
};

export default TicketsCustom;