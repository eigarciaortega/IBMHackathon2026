export interface User {
  id: number;
  name: string;
  email: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface UserBalance {
  user_id: number;
  name: string;
  balance: number;
}

// Made with Bob
