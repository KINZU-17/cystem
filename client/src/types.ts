export interface User {
  id: number;
  username: string;
  email: string;
  phone_number: string;
  is_admin: boolean;
  agent_tier: string;
  trust_score: number;
  balance_ksh: number;
  points: number;
}

export interface Player {
  user_id: number;
  username: string;
  role: 'HUNTER' | 'RUNNER';
  hp: number;
  ready: boolean;
  has_extra_life: boolean;
}

export interface MatchDetails {
  id: number;
  code: string;
  name: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
  host_id: number;
  hider_id: number;
  stake_amount_ksh: number;
  total_pool_ksh: number;
  radius_meters: number;
  center_lat?: number;
  center_lon?: number;
  duration_seconds: number;
  elapsed_seconds: number;
  clue_cascade_unlocked: boolean;
  winner_id?: number;
  win_reason?: string;
  players: Player[];
  hints_count: number;
}

export interface Hint {
  id: number;
  clue_number: number;
  media_url?: string;
  media_type: string;
  hint_text?: string;
  created_at: string;
}

export interface TransactionItem {
  id: number;
  amount_ksh: number;
  points_delta: number;
  type: string;
  status: string;
  receipt?: string;
  description?: string;
  date: string;
}

export interface DisputeItem {
  id: number;
  match_id: number;
  match_code: string;
  match_name: string;
  stake_amount_ksh: number;
  claimant_username: string;
  reason: string;
  status: string;
  admin_note?: string;
  created_at: string;
}

export interface StormStatus {
  phase: number;
  current_radius: number;
  next_radius: number;
  closes_in_seconds: number;
  dist_from_center: number;
  in_safe_zone: boolean;
  damage_rate: number;
}
