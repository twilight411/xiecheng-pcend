import { Layout, Space, Typography } from 'antd'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearStoredAuth, getStoredUser } from '../services/auth.js'

const { Header, Content } = Layout
const { Text } = Typography

function MerchantLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isListPage = location.pathname === '/merchant' || location.pathname === '/merchant/hotels'
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
        <Link to="/merchant/hotels" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Text strong style={{ fontSize: 18 }}>
            易宿商户中心
          </Text>
        </Link>
        <Space>
          {user?.username && <Text type="secondary">{user.username}</Text>}
          {!isListPage && (
            <Text
              type="link"
              onClick={() => navigate('/merchant/hotels')}
              style={{ cursor: 'pointer' }}
            >
              返回列表
            </Text>
          )}
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

export default MerchantLayout
