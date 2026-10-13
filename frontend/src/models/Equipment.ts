export interface SpecRow {
  label: string
  value: string
}

export interface SpecSection {
  section: string
  rows: SpecRow[]
}

export interface Equipment {
  id: string
  institutionId?: string
  name: string
  type: string
  address: string
  hours: string
  status: 'open' | 'closed'
  distance?: string
  image?: string
  image3d?: string
  /**
   * Массив разделов из справочника оборудования; у демо-позиций может
   * встретиться плоский объект «подпись -> значение».
   */
  characteristics?: SpecSection[] | Record<string, unknown>
}
