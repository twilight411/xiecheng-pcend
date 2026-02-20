import { Button, Card, ConfigProvider, Form, Input, Radio, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/auth.js'
import { USER_ROLES } from '../constants/index.js'
import loginBg from '../assets/登录注册背景.png'

const { Title } = Typography

function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleFinish = async (values) => {
    setLoading(true)
    try {
      const data = await login({ username: values.username, password: values.password })
      const role = data?.user?.role ?? values.role ?? USER_ROLES.MERCHANT
      if (role === 'admin') {
        navigate('/admin/review')
      } else {
        navigate('/merchant')
      }
    } catch {
      // 错误已由 request 拦截器统一 message 提示
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
            colorText: '#ffffff', // ✨ 单选框文案颜色
          }
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
            width: 400,
            backdropFilter: 'blur(14px)',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            borderColor: 'rgba(255, 255, 255, 0.45)',
            boxShadow: '0 18px 45px rgba(0, 0, 0, 0.35)',
          }}
        >
          <Title level={3} style={{ textAlign: 'center', marginBottom: 24, color: '#fff' }}>
            易宿酒店管理后台 - 登录
          </Title>
          <Form layout="vertical" onFinish={handleFinish} initialValues={{ role: USER_ROLES.MERCHANT }}>
            <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
            <Form.Item label="角色" name="role">
              <Radio.Group>
                <Radio value={USER_ROLES.MERCHANT}>商户</Radio>
                <Radio value={USER_ROLES.ADMIN}>管理员</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{ backgroundColor: '#FFB300', borderColor: '#FFB300' }}
              >
                登录（占位）
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </ConfigProvider>
  )
}

export default Login

