import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
});

// api.interceptors.response.use(
//   (response) => response,

//   async (error) => {
//     if (error.response?.status === 401) {

//       console.log("인증 만료 → 로그아웃 처리");

//       window.location.href = "/";
//     }

//     return Promise.reject(error);
//   }
// );
