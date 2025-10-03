import axios from "axios";

const api = axios.create({
	baseURL: process.env.REACT_APP_BACKEND_URL,
	withCredentials: true,
});

// Interceptador para requisições com upload de arquivos (FormData)
api.interceptors.request.use(config => {
	// Verifica se a requisição contém FormData para configuar o Content-Type apropriado
	if (config.data instanceof FormData) {
		Object.assign(config.headers, {
			'Content-Type': 'multipart/form-data'
		});
	}
	return config;
});

// Interceptador para respostas para tratamento de erros
api.interceptors.response.use(
	response => {
		return response;
	},
	error => {
		// Manter apenas erro crítico para produção
		if (process.env.NODE_ENV === 'development') {
			console.error(
				`[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}: ${error.message}`,
				error.response?.status, 
				error.response?.data
			);
		}
		return Promise.reject(error);
	}
);

export const openApi = axios.create({
	baseURL: process.env.REACT_APP_BACKEND_URL
});

export default api;
