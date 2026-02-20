import axios from 'axios'
import { message as antdMessage } from 'antd'

// 后端基础地址，可在 .env 中通过 VITE_API_BASE_URL 覆盖
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

request.interceptors.request.use(
  (config) => {
    // 后续可在此注入 token：config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  (response) => {
    const body = response.data
    // 后端统一格式：{ code: 0, message, data, meta }
    if (body && typeof body.code !== 'undefined' && body.code !== 0) {
      antdMessage.error(body.message || '请求失败')
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    return body
  },
  (error) => {
    const msg = error.response?.data?.message || error.message || '网络错误'
    antdMessage.error(msg)
    return Promise.reject(error)
  },
)

export default request

