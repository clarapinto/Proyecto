export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'request_creator' | 'procurement_approver' | 'supplier' | 'admin'
export type RequestStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'evaluation' | 'awarded' | 'cancelled'
export type ProposalStatus = 'draft' | 'submitted' | 'under_review' | 'adjustment_requested' | 'finalist' | 'awarded' | 'not_selected'
export type AwardSelectionStatus = 'pending_approval' | 'approved' | 'rejected'

export interface Database {
  public: {
    Tables: {
      users_profile: {
        Row: {
          id: string
          user_id: string
          role: UserRole
          full_name: string
          email: string
          phone: string | null
          area: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: UserRole
          full_name: string
          email: string
          phone?: string | null
          area?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: UserRole
          full_name?: string
          email?: string
          phone?: string | null
          area?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_name: string
          contact_email: string
          contact_phone: string | null
          contract_fee_percentage: number
          is_active: boolean
          total_invitations: number
          total_awards: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_name: string
          contact_email: string
          contact_phone?: string | null
          contract_fee_percentage: number
          is_active?: boolean
          total_invitations?: number
          total_awards?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_name?: string
          contact_email?: string
          contact_phone?: string | null
          contract_fee_percentage?: number
          is_active?: boolean
          total_invitations?: number
          total_awards?: number
          created_at?: string
          updated_at?: string
        }
      }
      requests: {
        Row: {
          id: string
          request_number: string
          creator_id: string
          event_type: string
          title: string
          description: string
          internal_budget: number | null
          status: RequestStatus
          max_rounds: number
          current_round: number
          round_deadline: string | null
          approved_by: string | null
          approved_at: string | null
          approval_comments: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_number?: string
          creator_id: string
          event_type: string
          title: string
          description: string
          internal_budget?: number | null
          status?: RequestStatus
          max_rounds?: number
          current_round?: number
          round_deadline?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approval_comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_number?: string
          creator_id?: string
          event_type?: string
          title?: string
          description?: string
          internal_budget?: number | null
          status?: RequestStatus
          max_rounds?: number
          current_round?: number
          round_deadline?: string | null
          approved_by?: string | null
          approved_at?: string | null
          approval_comments?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      request_attachments: {
        Row: {
          id: string
          request_id: string
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string
          created_at?: string
        }
      }
      request_invitations: {
        Row: {
          id: string
          request_id: string
          supplier_id: string
          invited_at: string
          notified_at: string | null
        }
        Insert: {
          id?: string
          request_id: string
          supplier_id: string
          invited_at?: string
          notified_at?: string | null
        }
        Update: {
          id?: string
          request_id?: string
          supplier_id?: string
          invited_at?: string
          notified_at?: string | null
        }
      }
      proposals: {
        Row: {
          id: string
          request_id: string
          supplier_id: string
          round_number: number
          subtotal: number
          fee_amount: number
          total_amount: number
          contextual_info: string | null
          status: ProposalStatus
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          supplier_id: string
          round_number?: number
          subtotal?: number
          fee_amount?: number
          total_amount?: number
          contextual_info?: string | null
          status?: ProposalStatus
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          supplier_id?: string
          round_number?: number
          subtotal?: number
          fee_amount?: number
          total_amount?: number
          contextual_info?: string | null
          status?: ProposalStatus
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      proposal_items: {
        Row: {
          id: string
          proposal_id: string
          item_name: string
          description: string | null
          quantity: number
          unit_price: number
          total_price: number
          needs_adjustment: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          item_name: string
          description?: string | null
          quantity?: number
          unit_price: number
          total_price: number
          needs_adjustment?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          item_name?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          needs_adjustment?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      proposal_attachments: {
        Row: {
          id: string
          proposal_id: string
          proposal_item_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          proposal_item_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          proposal_item_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
        }
      }
      proposal_feedback: {
        Row: {
          id: string
          proposal_id: string
          proposal_item_id: string | null
          feedback_text: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          proposal_item_id?: string | null
          feedback_text: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          proposal_item_id?: string | null
          feedback_text?: string
          created_by?: string
          created_at?: string
        }
      }
      awards: {
        Row: {
          id: string
          request_id: string
          winning_proposal_id: string
          winning_supplier_id: string
          awarded_amount: number
          is_lowest_price: boolean
          justification: string | null
          awarded_by: string
          awarded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          winning_proposal_id: string
          winning_supplier_id: string
          awarded_amount: number
          is_lowest_price: boolean
          justification?: string | null
          awarded_by: string
          awarded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          winning_proposal_id?: string
          winning_supplier_id?: string
          awarded_amount?: number
          is_lowest_price?: boolean
          justification?: string | null
          awarded_by?: string
          awarded_at?: string
          created_at?: string
        }
      }
      award_selections: {
        Row: {
          id: string
          request_id: string
          selected_proposal_id: string
          selected_supplier_id: string
          selected_amount: number
          is_lowest_price: boolean
          creator_justification: string | null
          selected_by: string
          selected_at: string
          status: AwardSelectionStatus
          approved_by: string | null
          approved_at: string | null
          approval_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          selected_proposal_id: string
          selected_supplier_id: string
          selected_amount: number
          is_lowest_price: boolean
          creator_justification?: string | null
          selected_by: string
          selected_at?: string
          status?: AwardSelectionStatus
          approved_by?: string | null
          approved_at?: string | null
          approval_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          selected_proposal_id?: string
          selected_supplier_id?: string
          selected_amount?: number
          is_lowest_price?: boolean
          creator_justification?: string | null
          selected_by?: string
          selected_at?: string
          status?: AwardSelectionStatus
          approved_by?: string | null
          approved_at?: string | null
          approval_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          related_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          related_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          related_id?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      request_status: RequestStatus
      proposal_status: ProposalStatus
      award_selection_status: AwardSelectionStatus
    }
  }
}
