import { setStoredAuth } from '../services/authStorage.js'
import { USER_ROLES } from '../constants/index.js'

/**
 * 公开演示（如 Vercel）：登录页可任意填写（或留空）后按所选角色进入对应端。
 * - 默认：Vercel 构建自动开启（vite 注入 __VERCEL_BUILD__）。
 * - 本地：VITE_PUBLIC_DEMO=true；关闭：VITE_PUBLIC_DEMO=false。
 * 若线上 API 需 JWT：在部署环境配置 VITE_DEMO_BEARER_TOKEN。
 */
export function isPublicDemoMode() {
  const v = import.meta.env.VITE_PUBLIC_DEMO
  if (v === 'false' || v === '0' || v === 'no') return false
  if (v === 'true' || v === '1' || v === 'yes') return true
  return typeof __VERCEL_BUILD__ !== 'undefined' && __VERCEL_BUILD__ === true
}

/** 演示态：写入本地访客会话（不请求 /auth/login），供按角色跳转 */
export function persistGuestDemoSession({ username, role }) {
  if (!isPublicDemoMode()) return
  const name = (username != null ? String(username) : '').trim() || '访客'
  const r = role === USER_ROLES.ADMIN ? USER_ROLES.ADMIN : USER_ROLES.MERCHANT
  const demoToken = String(import.meta.env.VITE_DEMO_BEARER_TOKEN || '').trim()
  setStoredAuth(
    { id: 'guest-demo', username: name, role: r },
    demoToken || undefined,
  )
}
