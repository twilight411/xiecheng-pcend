import { getStoredToken, getStoredUser, setStoredAuth } from '../services/authStorage.js'
import { USER_ROLES } from '../constants/index.js'

/**
 * 公开演示（如 Vercel）：跳过登录注册，根路径进入商户端。
 * - 默认：在 Vercel 上构建时自动开启（vite 注入 __VERCEL_BUILD__）。
 * - 本地或其它环境：可设 VITE_PUBLIC_DEMO=true 强制开启；设 VITE_PUBLIC_DEMO=false 在 Vercel 上关闭。
 * 若线上 API 仍要求 Bearer，可设 VITE_DEMO_BEARER_TOKEN（仅部署平台变量，勿提交仓库）。
 */
export function isPublicDemoMode() {
  const v = import.meta.env.VITE_PUBLIC_DEMO
  if (v === 'false' || v === '0' || v === 'no') return false
  if (v === 'true' || v === '1' || v === 'yes') return true
  return typeof __VERCEL_BUILD__ !== 'undefined' && __VERCEL_BUILD__ === true
}

export function ensurePublicDemoAuth() {
  if (!isPublicDemoMode()) return
  const demoToken = String(import.meta.env.VITE_DEMO_BEARER_TOKEN || '').trim()
  const user = getStoredUser()
  const token = getStoredToken()

  if (user) {
    if (demoToken && !token) setStoredAuth(user, demoToken)
    return
  }

  setStoredAuth(
    { id: 'demo-visitor', username: '访客演示', role: USER_ROLES.MERCHANT },
    demoToken || undefined,
  )
}
