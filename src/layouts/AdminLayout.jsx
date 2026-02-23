import { Layout, Space, Typography } from 'antd'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { clearStoredAuth, getStoredUser } from '../services/auth.js'

const { Header, Content } = Layout
const { Text, Title } = Typography

function AdminLayout() {
  const navigate = useNavigate()
  const user = getStoredUser()

  const handleLogout = () => {
    clearStoredAuth()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          paddingInline: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Link to="/admin/review" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Title level={5} style={{ margin: 0, fontSize: 18 }}>
            易宿审核后台
          </Title>
        </Link>
        <Space>
          {user?.username && <Text type="secondary">{user.username}</Text>}
          <Text type="link" onClick={handleLogout} style={{ cursor: 'pointer' }}>
            退出登录
          </Text>
        </Space>
      </Header>
      <Content style={{ background: '#f5f5f5' }}>
        <div style={{ padding: 24 }}>
          <Outlet />
        </div>
      </Content>
    </Layout>
  )
}

export default AdminLayout

