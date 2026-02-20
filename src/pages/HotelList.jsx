import { Button, Card, Space, Table, Tag, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography

const mockHotels = [
  {
    id: 'template',
    name: '【示例】陆家嘴示范酒店',
    city: '上海',
    status: 'template',
    updatedAt: '2025-01-01',
  },
  {
    id: '1',
    name: '上海陆家嘴禧酒店',
    city: '上海',
    status: 'draft',
    updatedAt: '2025-02-01',
  },
]

function HotelList() {
  const navigate = useNavigate()

  const columns = [
    {
      title: '酒店名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          {record.status === 'template' && <Tag color="gold">新手参考模板</Tag>}
        </Space>
      ),
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'template') return <Tag color="default">模板</Tag>
        if (status === 'draft') return <Tag color="blue">草稿</Tag>
        if (status === 'online') return <Tag color="green">已上线</Tag>
        return <Tag>未知</Tag>
      },
    },
    {
      title: '最近更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => {
        if (record.status === 'template') {
          return (
            <Button type="link" onClick={() => navigate('/merchant/hotels/new?from=template')}>
              基于模板新建酒店
            </Button>
          )
        }
        return (
          <Space>
            <Button type="link" onClick={() => navigate(`/merchant/hotels/${record.id}`)}>
              查看 / 编辑
            </Button>
          </Space>
        )
      },
    },
  ]

  return (
    <div className="page-hotel-list">
      <Card>
        <Title level={3} style={{ marginBottom: 8 }}>
          我的酒店
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          首次使用建议先点击上方模板酒店，了解推荐的填写方式；之后可以基于模板快速创建属于自己的酒店。
        </Paragraph>
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button type="primary" onClick={() => navigate('/merchant/hotels/new')}>
            新建酒店
          </Button>
        </div>
        <Table rowKey="id" columns={columns} dataSource={mockHotels} pagination={false} />
        <Paragraph type="secondary" style={{ marginTop: 12 }}>
          <Text>提示：</Text>
          <Text>当前数据为前端示例数据，接入后端后将展示商户实际上传的酒店列表。</Text>
        </Paragraph>
      </Card>
    </div>
  )
}

export default HotelList

