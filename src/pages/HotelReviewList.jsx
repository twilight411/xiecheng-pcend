import { Badge, Button, Card, Space, Table, Tag, Typography } from 'antd'
import { REVIEW_STATUS } from '../constants/index.js'

const { Title } = Typography

const columns = [
  {
    title: '酒店名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '商户',
    dataIndex: 'merchant',
    key: 'merchant',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (value) => {
      switch (value) {
        case REVIEW_STATUS.APPROVED:
          return <Tag color="green">通过</Tag>
        case REVIEW_STATUS.REJECTED:
          return <Tag color="red">不通过</Tag>
        case REVIEW_STATUS.OFFLINE:
          return <Tag color="default">已下线</Tag>
        default:
          return (
            <Tag color="processing">
              <Badge status="processing" /> 审核中
            </Tag>
          )
      }
    },
  },
  {
    title: '操作',
    key: 'actions',
    render: () => (
      <Space>
        <Button type="link" size="small">
          通过
        </Button>
        <Button type="link" size="small" danger>
          不通过
        </Button>
        <Button type="link" size="small">
          下线/恢复
        </Button>
      </Space>
    ),
  },
]

// 占位数据，后续改为真实接口数据
const mockData = []

function HotelReviewList() {
  return (
    <div className="page-hotel-review" style={{ padding: 24 }}>
      <Card>
        <Title level={3} style={{ marginBottom: 16 }}>
          酒店信息审核 / 发布 / 下线（占位）
        </Title>
        <Table rowKey="id" columns={columns} dataSource={mockData} pagination={false} />
      </Card>
    </div>
  )
}

export default HotelReviewList

