export type CompanyProfile = {
  display_name: string
  industry: string
  location: string
  employee_count: number | null
  funding_stage: string | null
  total_funding_raised: number | null
  has_free_plan: boolean
  product_type: string
  gtm_motion: 'PLG' | 'SLG'
  buyer_persona: string
  customer_segment: 'SMB' | 'Mid-Market' | 'Enterprise'
  estimated_acv: number
  estimated_ae_count: string
  estimated_customer_count: number | null
}
