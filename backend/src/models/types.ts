export type UserTier = 'UNVERIFIED' | 'VERIFIED' | 'COMMUNITY';
export type UserStatus = 'ACTIVE' | 'FROZEN' | 'SUSPENDED';
export type OrderStatus = 'PREPAID' | 'COMPLETED' | 'DISPUTED';
export type TxType = 'DOWN_PAYMENT' | 'SUBSIDY' | 'SETTLEMENT' | 'TASK_CREDIT' | 'FEE';
export type TaskCategory = 'PLATFORM' | 'MERCHANT' | 'COMMUNITY';
export type TaskStatus = 'OPEN' | 'ASSIGNED' | 'COMPLETED_PENDING' | 'VERIFIED' | 'CANCELLED';

export interface User {
  id: string;
  phone: string;
  name: string;
  tier: UserTier;
  status: UserStatus;
  clean_cycles: number;
  outstanding_balance: number;
  total_subsidized: number;
  wallet_address: string | null;
  kind_balance: number;
  created_at: string;
  frozen_at: string | null;
}

export interface Merchant {
  id: string;
  name: string;
  location: string;
  is_active: number;
  total_prepaid: number;
  total_revenue: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  price: number;
  available: number;
  category: string;
  image: string | null;
}

export interface Order {
  id: string;
  user_id: string;
  merchant_id: string;
  total_cost: number;
  down_payment: number;
  outstanding: number;
  fee: number;
  status: OrderStatus;
  created_at: string;
  due_at: string;
}

export interface Transaction {
  id: string;
  order_id: string | null;
  user_id: string;
  merchant_id: string | null;
  amount: number;
  type: TxType;
  status: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  credit_value: number;
  assigned_to: string | null;
  merchant_id: string | null;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
}

export interface TierLimit {
  tier: UserTier;
  max_subsidy: number;
  window_days: number;
  min_cycles: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
