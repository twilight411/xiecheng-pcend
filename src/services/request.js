import axios from 'axios'
import { message as antdMessage } from 'antd'
import { getStoredToken } from './authStorage.js'

// 后端基础地址，可在 .env 中通过 VITE_API_BASE_URL 覆盖
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

request.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

function getAuthDisplayMessage(url, code, backendMsg) {
  const c = Number(code)
  if (url.includes('/auth/login')) {
    if (c === 1001 || /未注册|不存在|not found|no user/i.test(backendMsg)) return '该用户未注册，请先注册'
    if (c === 1002 || /密码|password|invalid|wrong|credentials|错误|username/i.test(backendMsg)) return '用户名或密码错误，请重试'
    return backendMsg || '登录失败，请检查用户名和密码'
  }
  if (url.includes('/auth/register')) {
    if (c === 1003 || /already exists|已存在|重复/i.test(backendMsg)) return '用户名已存在，请更换用户名'
    return backendMsg || '注册失败，请重试'
  }
  return backendMsg || '请求失败'
}

request.interceptors.response.use(
  (response) => {
    const body = response.data
    const url = response.config?.url || ''
    if (body && typeof body.code !== 'undefined' && body.code !== 0) {
      const msg = (url.includes('/auth/login') || url.includes('/auth/register'))
        ? getAuthDisplayMessage(url, body.code, body.message)
        : (body.message || '请求失败')
      antdMessage.error(msg)
      return Promise.reject(new Error(msg))
    }
    return body
  },
  (error) => {
    const url = error.config?.url || ''
    const status = error.response?.status
    const data = error.response?.data
    const code = data?.code
    const backendMsg =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.msg === 'string' && data.msg) ||
      (typeof data?.error === 'string' && data.error) ||
      ''
    let displayMsg =
      url.includes('/auth/login') || url.includes('/auth/register')
        ? getAuthDisplayMessage(url, code, backendMsg)
        : (backendMsg || error.message || '网络错误')
    if (status === 404 && /\/hotels\/[^/]+/.test(url)) {
      displayMsg =
        '酒店详情或操作失败（404）。请确认后端 GET /hotels/:id 与 POST /hotels/:id/approve 等接口对该 id 可用，且管理员可访问任意状态酒店。'
    }
    const finalMsg = displayMsg || '请求失败，请重试'
    antdMessage.error(finalMsg)
    return Promise.reject(error)
  },
)

export default request

