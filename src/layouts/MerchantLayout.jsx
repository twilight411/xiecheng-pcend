import { Layout, Menu, Typography } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const MENU_ITEMS = [
  {
    key: '/merchant/hotels',
    label: '我的酒店',
  },
  {
    key: '/merchant/hotels/new',
    label: '新建酒店',
  },
]

function MerchantLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const selectedKeys = MENU_ITEMS.some((item) => location.pathname.startsWith(item.key))
    ? [MENU_ITEMS.find((item) => location.pathname.startsWith(item.key))?.key]
    : ['/merchant/hotels']

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200}>
        <div style={{ padding: 16 }}>
          <Title level={4} style={{ color: '#fff', margin: 0, fontSize: 18 }}>
            易宿商户中心
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={MENU_ITEMS}
          onClick={(info) => navigate(info.key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', paddingInline: 24, display: 'flex', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0 }}>
            酒店管理
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

export default MerchantLayout

