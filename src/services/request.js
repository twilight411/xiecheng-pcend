import axios from 'axios'

// 后端基础地址，可在 .env 中通过 VITE_API_BASE_URL 覆盖
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

request.interceptors.request.use(
  (config) => {
    // TODO: 这里后续可以注入 token
    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // TODO: 这里可以做全局错误提示
    console.error('API Error:', error)
    return Promise.reject(error)
  },
)

export default request

