export interface Equipment {
  id: string
  name: string
  type: string
  address: string
  hours: string
  status: 'open' | 'closed'
  distance?: string
  image?: string
  image3d?: string
  characteristics?: Record<string, any>
}
