import { Alert, Button, Card, ConfigProvider, Form, Input, Radio, Typography } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isPublicDemoMode, persistGuestDemoSession } from '../config/publicDemo.js'
import { login } from '../services/auth.js'
import { USER_ROLES } from '../constants/index.js'
import loginBg from '../assets/登录注册背景.png'

const { Title, Text } = Typography

function Login() {
  const demo = isPublicDemoMode()
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const navigate = useNavigate()

  const handleFinish = async (values) => {
    setLoginError('')
    setLoading(true)
    try {
      if (demo) {
        persistGuestDemoSession({
          username: values.username,
          role: values.role,
        })
        const role = values.role === USER_ROLES.ADMIN ? USER_ROLES.ADMIN : USER_ROLES.MERCHANT
        if (role === USER_ROLES.ADMIN) {
          navigate('/admin/review', { replace: true })
        } else {
          navigate('/merchant/hotels', { replace: true })
        }
        return
      }

      const data = await login({ username: values.username, password: values.password })
      const role = data?.user?.role ?? USER_ROLES.MERCHANT
      if (role === 'admin') {
        navigate('/admin/review')
      } else {
        navigate('/merchant')
      }
    } catch (err) {
      const code = err?.response?.data?.code
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        err?.response?.data?.error ||
        err?.message
      if (code === 1001 || /未注册|不存在|not found/i.test(msg || '')) {
        setLoginError('该用户未注册，请先注册后再登录。')
      } else if (code === 1002 || /密码|password|invalid|wrong|username/i.test(msg || '')) {
        setLoginError('用户名或密码错误，请重试。')
      } else {
        setLoginError(typeof msg === 'string' && msg ? msg : '登录失败，请检查用户名和密码。')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#FFB300', // 琥珀黄主色
        },
        components: {
          Form: {
            labelColor: '#ffffff', // ✨ 专门设置表单 Label 颜色
          },
          Radio: {
            colorPrimary: '#FFB300',
          },
        },
      }}
    >
      <div
        className="page-login"
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Card
          style={{
            width: 440,
            backdropFilter: 'blur(14px)',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            borderColor: 'rgba(255, 255, 255, 0.45)',
            boxShadow: '0 18px 45px rgba(0, 0, 0, 0.35)',
          }}
        >
          <Title level={3} style={{ textAlign: 'center', marginBottom: 24, color: '#fff' }}>
            易宿酒店管理后台 - 登录
          </Title>
          {demo && (
            <Alert
              type="info"
              showIcon
              message="作品演示：用户名和密码可随意填写或留空，请选择角色后点「登录」即可浏览对应界面。"
              style={{ marginBottom: 16, textAlign: 'left' }}
            />
          )}
          {loginError && (
            <Alert
              type="error"
              showIcon
              message={loginError}
              style={{ marginBottom: 16 }}
              closable
              onClose={() => setLoginError('')}
            />
          )}
          <Form
            layout="vertical"
            onFinish={handleFinish}
            initialValues={demo ? { role: USER_ROLES.MERCHANT } : {}}
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={demo ? [] : [{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder={demo ? '可留空或随便填' : '请输入用户名'} allowClear />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={demo ? [] : [{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder={demo ? '可留空或随便填' : '请输入密码'} allowClear />
            </Form.Item>
            {demo && (
              <Form.Item label="进入作品（角色）" name="role" rules={[{ required: true, message: '请选择角色' }]}>
                <Radio.Group>
                  <Radio value={USER_ROLES.MERCHANT}>商户端（酒店列表与编辑）</Radio>
                  <Radio value={USER_ROLES.ADMIN}>管理员端（审核后台）</Radio>
                </Radio.Group>
              </Form.Item>
            )}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{ backgroundColor: '#FFB300', borderColor: '#FFB300' }}
              >
                登录
              </Button>
            </Form.Item>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text type="secondary" style={{ color: 'rgba(255,255,255,0.65)' }}>没有账号？</Text>
              <Link to="/register" style={{ marginLeft: 4, color: '#FFB300' }}>去注册</Link>
            </div>
          </Form>
        </Card>
      </div>
    </ConfigProvider>
  )
}

export default Login
