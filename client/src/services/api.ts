import axios from "axios";
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||"http://localhost:4000/api",timeout:15000});
api.interceptors.request.use(config=>{const token=sessionStorage.getItem("sv_token");if(token)config.headers.Authorization=`Bearer ${token}`;return config});
api.interceptors.response.use(r=>r,e=>Promise.reject(new Error(e.response?.data?.error||e.message)));
