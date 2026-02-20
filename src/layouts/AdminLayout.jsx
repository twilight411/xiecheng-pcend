import { Layout, Menu, Typography } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const ADMIN_MENU_ITEMS = [
  {
    key: '/admin/review',
    label: '酒店审核列表',
  },
]

function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const selectedKeys = ADMIN_MENU_ITEMS.some((item) => location.pathname.startsWith(item.key))
    ? [ADMIN_MENU_ITEMS.find((item) => location.pathname.startsWith(item.key))?.key]
    : ['/admin/review']

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200}>
        <div style={{ padding: 16 }}>
          <Title level={4} style={{ color: '#fff', margin: 0, fontSize: 18 }}>
            易宿审核后台
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={ADMIN_MENU_ITEMS}
          onClick={(info) => navigate(info.key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', paddingInline: 24, display: 'flex', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0 }}>
            酒店信息审核
          </Title>
        </Header>
        <Content style={{ background: '#f5f5f5' }}>
          <div style={{ padding: 24 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout

