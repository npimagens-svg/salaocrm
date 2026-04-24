export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_level_permissions: {
        Row: {
          access_level_id: string
          created_at: string
          enabled: boolean
          id: string
          permission_key: string
        }
        Insert: {
          access_level_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          permission_key: string
        }
        Update: {
          access_level_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_level_permissions_access_level_id_fkey"
            columns: ["access_level_id"]
            isOneToOne: false
            referencedRelation: "access_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      access_levels: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          salon_id: string | null
          system_key: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          salon_id?: string | null
          system_key?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          salon_id?: string | null
          system_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_levels_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          price: number | null
          professional_id: string
          salon_id: string
          scheduled_at: string
          service_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          price?: number | null
          professional_id: string
          salon_id: string
          scheduled_at: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          price?: number | null
          professional_id?: string
          salon_id?: string
          scheduled_at?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          salon_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          salon_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      caixas: {
        Row: {
          closed_at: string | null
          closing_balance: number | null
          created_at: string
          id: string
          notes: string | null
          opened_at: string
          opening_balance: number
          salon_id: string
          total_cash: number | null
          total_credit_card: number | null
          total_debit_card: number | null
          total_other: number | null
          total_pix: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number
          salon_id: string
          total_cash?: number | null
          total_credit_card?: number | null
          total_debit_card?: number | null
          total_other?: number | null
          total_pix?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_balance?: number
          salon_id?: string
          total_cash?: number | null
          total_credit_card?: number | null
          total_debit_card?: number | null
          total_other?: number | null
          total_pix?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caixas_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      card_brands: {
        Row: {
          created_at: string
          credit_fee_percent: number
          debit_fee_percent: number
          id: string
          is_active: boolean
          name: string
          salon_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_fee_percent?: number
          debit_fee_percent?: number
          id?: string
          is_active?: boolean
          name: string
          salon_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_fee_percent?: number
          debit_fee_percent?: number
          id?: string
          is_active?: boolean
          name?: string
          salon_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_alerts: {
        Row: {
          alert_event: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          salon_id: string
          target_client_id: string | null
          target_tag: string | null
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          alert_event?: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          salon_id: string
          target_client_id?: string | null
          target_tag?: string | null
          target_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          alert_event?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          salon_id?: string
          target_client_id?: string | null
          target_tag?: string | null
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_alerts_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_alerts_target_client_id_fkey"
            columns: ["target_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credits: {
        Row: {
          client_id: string
          comanda_id: string | null
          created_at: string
          credit_amount: number
          expires_at: string
          id: string
          is_expired: boolean
          is_used: boolean
          min_purchase_amount: number
          salon_id: string
          used_at: string | null
          used_in_comanda_id: string | null
        }
        Insert: {
          client_id: string
          comanda_id?: string | null
          created_at?: string
          credit_amount?: number
          expires_at: string
          id?: string
          is_expired?: boolean
          is_used?: boolean
          min_purchase_amount?: number
          salon_id: string
          used_at?: string | null
          used_in_comanda_id?: string | null
        }
        Update: {
          client_id?: string
          comanda_id?: string | null
          created_at?: string
          credit_amount?: number
          expires_at?: string
          id?: string
          is_expired?: boolean
          is_used?: boolean
          min_purchase_amount?: number
          salon_id?: string
          used_at?: string | null
          used_in_comanda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_credits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_used_in_comanda_id_fkey"
            columns: ["used_in_comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
        ]
      }
      client_debts: {
        Row: {
          client_id: string
          comanda_id: string | null
          created_at: string
          debt_amount: number
          id: string
          is_paid: boolean
          notes: string | null
          paid_at: string | null
          paid_in_comanda_id: string | null
          salon_id: string
        }
        Insert: {
          client_id: string
          comanda_id?: string | null
          created_at?: string
          debt_amount?: number
          id?: string
          is_paid?: boolean
          notes?: string | null
          paid_at?: string | null
          paid_in_comanda_id?: string | null
          salon_id: string
        }
        Update: {
          client_id?: string
          comanda_id?: string | null
          created_at?: string
          debt_amount?: number
          id?: string
          is_paid?: boolean
          notes?: string | null
          paid_at?: string | null
          paid_in_comanda_id?: string | null
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_debts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_debts_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_debts_paid_in_comanda_id_fkey"
            columns: ["paid_in_comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_debts_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      client_history: {
        Row: {
          action_type: string
          client_id: string
          created_at: string
          description: string
          id: string
          new_value: Json | null
          old_value: Json | null
          performed_by: string
          salon_id: string
        }
        Insert: {
          action_type: string
          client_id: string
          created_at?: string
          description: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by: string
          salon_id: string
        }
        Update: {
          action_type?: string
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_history_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          add_cpf_invoice: boolean | null
          address: string | null
          address_complement: string | null
          address_number: string | null
          allow_ai_service: boolean | null
          allow_email_campaigns: boolean | null
          allow_online_booking: boolean | null
          allow_sms_campaigns: boolean | null
          allow_whatsapp_campaigns: boolean | null
          avatar_url: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          cpf: string | null
          created_at: string
          email: string | null
          gender: string | null
          how_met: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          phone_landline: string | null
          profession: string | null
          rg: string | null
          salon_id: string
          state: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          add_cpf_invoice?: boolean | null
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          allow_ai_service?: boolean | null
          allow_email_campaigns?: boolean | null
          allow_online_booking?: boolean | null
          allow_sms_campaigns?: boolean | null
          allow_whatsapp_campaigns?: boolean | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          how_met?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          phone_landline?: string | null
          profession?: string | null
          rg?: string | null
          salon_id: string
          state?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          add_cpf_invoice?: boolean | null
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          allow_ai_service?: boolean | null
          allow_email_campaigns?: boolean | null
          allow_online_booking?: boolean | null
          allow_sms_campaigns?: boolean | null
          allow_whatsapp_campaigns?: boolean | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          how_met?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          phone_landline?: string | null
          profession?: string | null
          rg?: string | null
          salon_id?: string
          state?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      comanda_deletions: {
        Row: {
          client_id: string | null
          client_name: string | null
          comanda_id: string
          comanda_total: number
          deleted_at: string
          deleted_by: string
          id: string
          original_closed_at: string | null
          original_created_at: string | null
          professional_id: string | null
          professional_name: string | null
          reason: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          comanda_id: string
          comanda_total?: number
          deleted_at?: string
          deleted_by: string
          id?: string
          original_closed_at?: string | null
          original_created_at?: string | null
          professional_id?: string | null
          professional_name?: string | null
          reason: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          comanda_id?: string
          comanda_total?: number
          deleted_at?: string
          deleted_by?: string
          id?: string
          original_closed_at?: string | null
          original_created_at?: string | null
          professional_id?: string | null
          professional_name?: string | null
          reason?: string
        }
        Relationships: []
      }
      comanda_items: {
        Row: {
          comanda_id: string
          created_at: string
          description: string
          id: string
          item_type: string
          product_cost: number | null
          product_id: string | null
          professional_id: string | null
          quantity: number
          service_id: string | null
          source_appointment_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          comanda_id: string
          created_at?: string
          description: string
          id?: string
          item_type?: string
          product_cost?: number | null
          product_id?: string | null
          professional_id?: string | null
          quantity?: number
          service_id?: string | null
          source_appointment_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          comanda_id?: string
          created_at?: string
          description?: string
          id?: string
          item_type?: string
          product_cost?: number | null
          product_id?: string | null
          professional_id?: string | null
          quantity?: number
          service_id?: string | null
          source_appointment_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "comanda_items_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_items_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_items_source_appointment_id_fkey"
            columns: ["source_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      comandas: {
        Row: {
          appointment_id: string | null
          caixa_id: string | null
          client_id: string | null
          closed_at: string | null
          created_at: string
          discount: number | null
          id: string
          is_paid: boolean | null
          professional_id: string | null
          salon_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          caixa_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          discount?: number | null
          id?: string
          is_paid?: boolean | null
          professional_id?: string | null
          salon_id: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          caixa_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          discount?: number | null
          id?: string
          is_paid?: boolean | null
          professional_id?: string | null
          salon_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comandas_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_settings: {
        Row: {
          admin_fee_display: string
          admin_fee_enabled: boolean
          admin_fee_percent: number
          admin_fee_scope: string
          anticipation_fee_enabled: boolean
          anticipation_fee_percent: number
          card_fee_display: string
          card_fee_mode: string
          card_payment_date: string
          created_at: string
          custom_card_fee_percent: number
          dual_assistant_rule: string
          gift_card_commission_percent: number
          id: string
          package_commission_enabled: boolean
          package_commission_percent: number
          presale_commission_percent: number
          presale_commission_rule: string
          product_cost_deduction: string
          product_sale_deduct_cost: boolean
          receipt_footer_message: string
          salon_id: string
          service_cost_enabled: boolean
          service_fee_display: string
          show_costs_values: boolean
          show_revenue_values: boolean
          updated_at: string
        }
        Insert: {
          admin_fee_display?: string
          admin_fee_enabled?: boolean
          admin_fee_percent?: number
          admin_fee_scope?: string
          anticipation_fee_enabled?: boolean
          anticipation_fee_percent?: number
          card_fee_display?: string
          card_fee_mode?: string
          card_payment_date?: string
          created_at?: string
          custom_card_fee_percent?: number
          dual_assistant_rule?: string
          gift_card_commission_percent?: number
          id?: string
          package_commission_enabled?: boolean
          package_commission_percent?: number
          presale_commission_percent?: number
          presale_commission_rule?: string
          product_cost_deduction?: string
          product_sale_deduct_cost?: boolean
          receipt_footer_message?: string
          salon_id: string
          service_cost_enabled?: boolean
          service_fee_display?: string
          show_costs_values?: boolean
          show_revenue_values?: boolean
          updated_at?: string
        }
        Update: {
          admin_fee_display?: string
          admin_fee_enabled?: boolean
          admin_fee_percent?: number
          admin_fee_scope?: string
          anticipation_fee_enabled?: boolean
          anticipation_fee_percent?: number
          card_fee_display?: string
          card_fee_mode?: string
          card_payment_date?: string
          created_at?: string
          custom_card_fee_percent?: number
          dual_assistant_rule?: string
          gift_card_commission_percent?: number
          id?: string
          package_commission_enabled?: boolean
          package_commission_percent?: number
          presale_commission_percent?: number
          presale_commission_rule?: string
          product_cost_deduction?: string
          product_sale_deduct_cost?: boolean
          receipt_footer_message?: string
          salon_id?: string
          service_cost_enabled?: boolean
          service_fee_display?: string
          show_costs_values?: boolean
          show_revenue_values?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_settings_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: true
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          recipients_count: number | null
          salon_id: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          target_client_ids: string[] | null
          target_tag: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          name: string
          recipients_count?: number | null
          salon_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          target_client_ids?: string[] | null
          target_tag?: string | null
          target_type?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          recipients_count?: number | null
          salon_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          target_client_ids?: string[] | null
          target_tag?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          bounced_at: string | null
          campaign_id: string | null
          clicked_at: string | null
          client_id: string | null
          complained_at: string | null
          created_at: string
          delivered_at: string | null
          email_type: string
          error_message: string | null
          id: string
          opened_at: string | null
          resend_id: string | null
          salon_id: string
          status: string
          subject: string
          to_email: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          client_id?: string | null
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          salon_id: string
          status?: string
          subject: string
          to_email?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          client_id?: string | null
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          salon_id?: string
          status?: string
          subject?: string
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          id: string
          payment_id: string | null
          salon_id: string
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          id?: string
          payment_id?: string | null
          salon_id: string
          transaction_date?: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          payment_id?: string | null
          salon_id?: string
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          card_brand_id: string | null
          comanda_id: string
          created_at: string
          fee_amount: number | null
          id: string
          net_amount: number | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          salon_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          card_brand_id?: string | null
          comanda_id: string
          created_at?: string
          fee_amount?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          salon_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          card_brand_id?: string | null
          comanda_id?: string
          created_at?: string
          fee_amount?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_card_brand_id_fkey"
            columns: ["card_brand_id"]
            isOneToOne: false
            referencedRelation: "card_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          commission_percent: number | null
          cost_price: number | null
          created_at: string
          current_stock: number | null
          current_stock_fractional: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_for_consumption: boolean | null
          is_for_resale: boolean | null
          min_stock: number | null
          name: string
          product_line: string | null
          sale_price: number | null
          salon_id: string
          sku: string | null
          supplier_id: string | null
          unit_of_measure: string | null
          unit_quantity: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          commission_percent?: number | null
          cost_price?: number | null
          created_at?: string
          current_stock?: number | null
          current_stock_fractional?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_for_consumption?: boolean | null
          is_for_resale?: boolean | null
          min_stock?: number | null
          name: string
          product_line?: string | null
          sale_price?: number | null
          salon_id: string
          sku?: string | null
          supplier_id?: string | null
          unit_of_measure?: string | null
          unit_quantity?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          commission_percent?: number | null
          cost_price?: number | null
          created_at?: string
          current_stock?: number | null
          current_stock_fractional?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_for_consumption?: boolean | null
          is_for_resale?: boolean | null
          min_stock?: number | null
          name?: string
          product_line?: string | null
          sale_price?: number | null
          salon_id?: string
          sku?: string | null
          supplier_id?: string | null
          unit_of_measure?: string | null
          unit_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_bank_details: {
        Row: {
          account_digit: string | null
          account_holder: string | null
          account_number: string | null
          account_type: string
          agency: string | null
          bank_name: string | null
          created_at: string
          holder_cpf: string | null
          id: string
          person_type: string
          pix_key: string | null
          professional_id: string
          transfer_type: string
          updated_at: string
        }
        Insert: {
          account_digit?: string | null
          account_holder?: string | null
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_name?: string | null
          created_at?: string
          holder_cpf?: string | null
          id?: string
          person_type?: string
          pix_key?: string | null
          professional_id: string
          transfer_type?: string
          updated_at?: string
        }
        Update: {
          account_digit?: string | null
          account_holder?: string | null
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_name?: string | null
          created_at?: string
          holder_cpf?: string | null
          id?: string
          person_type?: string
          pix_key?: string | null
          professional_id?: string
          transfer_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_bank_details_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_commission_rules: {
        Row: {
          card_payment_date: string | null
          contract_end: string | null
          contract_start: string | null
          contract_type: string | null
          created_at: string
          deduct_admin_fee: boolean | null
          deduct_anticipation: boolean | null
          deduct_card_fee: boolean | null
          deduct_product_cost: boolean | null
          deduct_service_cost: boolean | null
          id: string
          payment_frequency: string | null
          professional_id: string
          updated_at: string
        }
        Insert: {
          card_payment_date?: string | null
          contract_end?: string | null
          contract_start?: string | null
          contract_type?: string | null
          created_at?: string
          deduct_admin_fee?: boolean | null
          deduct_anticipation?: boolean | null
          deduct_card_fee?: boolean | null
          deduct_product_cost?: boolean | null
          deduct_service_cost?: boolean | null
          id?: string
          payment_frequency?: string | null
          professional_id: string
          updated_at?: string
        }
        Update: {
          card_payment_date?: string | null
          contract_end?: string | null
          contract_start?: string | null
          contract_type?: string | null
          created_at?: string
          deduct_admin_fee?: boolean | null
          deduct_anticipation?: boolean | null
          deduct_card_fee?: boolean | null
          deduct_product_cost?: boolean | null
          deduct_service_cost?: boolean | null
          id?: string
          payment_frequency?: string | null
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_commission_rules_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_service_commissions: {
        Row: {
          assistant_commission_percent: number | null
          commission_percent: number
          created_at: string
          duration_minutes: number | null
          id: string
          professional_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          assistant_commission_percent?: number | null
          commission_percent?: number
          created_at?: string
          duration_minutes?: number | null
          id?: string
          professional_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          assistant_commission_percent?: number | null
          commission_percent?: number
          created_at?: string
          duration_minutes?: number | null
          id?: string
          professional_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_service_commissions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_service_commissions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_work_schedules: {
        Row: {
          created_at: string
          end_time: string
          friday: boolean
          id: string
          monday: boolean
          professional_id: string
          saturday: boolean
          start_time: string
          sunday: boolean
          thursday: boolean
          tuesday: boolean
          updated_at: string
          wednesday: boolean
        }
        Insert: {
          created_at?: string
          end_time?: string
          friday?: boolean
          id?: string
          monday?: boolean
          professional_id: string
          saturday?: boolean
          start_time?: string
          sunday?: boolean
          thursday?: boolean
          tuesday?: boolean
          updated_at?: string
          wednesday?: boolean
        }
        Update: {
          created_at?: string
          end_time?: string
          friday?: boolean
          id?: string
          monday?: boolean
          professional_id?: string
          saturday?: boolean
          start_time?: string
          sunday?: boolean
          thursday?: boolean
          tuesday?: boolean
          updated_at?: string
          wednesday?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "professional_work_schedules_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          address: string | null
          agenda_color: string | null
          agenda_order: number | null
          avatar_url: string | null
          birth_date: string | null
          can_be_assistant: boolean | null
          cep: string | null
          city: string | null
          commission_percent: number | null
          cpf: string | null
          create_access: boolean | null
          created_at: string
          description: string | null
          email: string | null
          facebook: string | null
          has_schedule: boolean | null
          id: string
          instagram: string | null
          is_active: boolean | null
          mobile: string | null
          name: string
          neighborhood: string | null
          nickname: string | null
          phone: string | null
          rg: string | null
          role: string | null
          salon_id: string
          site: string | null
          specialty: string | null
          state: string | null
          twitter: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          agenda_color?: string | null
          agenda_order?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          can_be_assistant?: boolean | null
          cep?: string | null
          city?: string | null
          commission_percent?: number | null
          cpf?: string | null
          create_access?: boolean | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          has_schedule?: boolean | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          mobile?: string | null
          name: string
          neighborhood?: string | null
          nickname?: string | null
          phone?: string | null
          rg?: string | null
          role?: string | null
          salon_id: string
          site?: string | null
          specialty?: string | null
          state?: string | null
          twitter?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          agenda_color?: string | null
          agenda_order?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          can_be_assistant?: boolean | null
          cep?: string | null
          city?: string | null
          commission_percent?: number | null
          cpf?: string | null
          create_access?: boolean | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          has_schedule?: boolean | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          mobile?: string | null
          name?: string
          neighborhood?: string | null
          nickname?: string | null
          phone?: string | null
          rg?: string | null
          role?: string | null
          salon_id?: string
          site?: string | null
          specialty?: string | null
          state?: string | null
          twitter?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          salon_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          salon_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          salon_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          salon_id: string
          start_date: string | null
          target_product_id: string | null
          target_service_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          salon_id: string
          start_date?: string | null
          target_product_id?: string | null
          target_service_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          salon_id?: string
          start_date?: string | null
          target_product_id?: string | null
          target_service_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_target_service_id_fkey"
            columns: ["target_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          address: string | null
          city_registration: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          state_registration: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city_registration?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city_registration?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduling_settings: {
        Row: {
          allow_simultaneous: boolean
          auto_confirm: boolean
          closing_time: string
          created_at: string
          default_columns: number
          friday: boolean
          id: string
          max_advance_days: number
          min_advance_hours: number
          monday: boolean
          opening_time: string
          salon_id: string
          saturday: boolean
          slot_interval_minutes: number
          sunday: boolean
          thursday: boolean
          tuesday: boolean
          updated_at: string
          wednesday: boolean
        }
        Insert: {
          allow_simultaneous?: boolean
          auto_confirm?: boolean
          closing_time?: string
          created_at?: string
          default_columns?: number
          friday?: boolean
          id?: string
          max_advance_days?: number
          min_advance_hours?: number
          monday?: boolean
          opening_time?: string
          salon_id: string
          saturday?: boolean
          slot_interval_minutes?: number
          sunday?: boolean
          thursday?: boolean
          tuesday?: boolean
          updated_at?: string
          wednesday?: boolean
        }
        Update: {
          allow_simultaneous?: boolean
          auto_confirm?: boolean
          closing_time?: string
          created_at?: string
          default_columns?: number
          friday?: boolean
          id?: string
          max_advance_days?: number
          min_advance_hours?: number
          monday?: boolean
          opening_time?: string
          salon_id?: string
          saturday?: boolean
          slot_interval_minutes?: number
          sunday?: boolean
          thursday?: boolean
          tuesday?: boolean
          updated_at?: string
          wednesday?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_settings_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: true
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      service_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity_per_use: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity_per_use?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity_per_use?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_products_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          commission_percent: number | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          return_reminder_days: number | null
          return_reminder_message: string | null
          salon_id: string
          send_return_reminder: boolean
          updated_at: string
        }
        Insert: {
          category?: string | null
          commission_percent?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          return_reminder_days?: number | null
          return_reminder_message?: string | null
          salon_id: string
          send_return_reminder?: boolean
          updated_at?: string
        }
        Update: {
          category?: string | null
          commission_percent?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          return_reminder_days?: number | null
          return_reminder_message?: string | null
          salon_id?: string
          send_return_reminder?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_campaigns: {
        Row: {
          created_at: string
          id: string
          message: string
          name: string
          recipients_count: number | null
          salon_id: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          target_client_ids: string[] | null
          target_tag: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          name: string
          recipients_count?: number | null
          salon_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          target_client_ids?: string[] | null
          target_tag?: string | null
          target_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          name?: string
          recipients_count?: number | null
          salon_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          target_client_ids?: string[] | null
          target_tag?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaigns_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_stock: number
          notes: string | null
          previous_stock: number
          product_id: string
          quantity: number
          salon_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_stock: number
          notes?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          salon_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          cep: string | null
          city: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          mobile: string | null
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          responsible: string | null
          salon_id: string
          state: string | null
          trade_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          cep?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          mobile?: string | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          responsible?: string | null
          salon_id: string
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          cep?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          mobile?: string | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          responsible?: string | null
          salon_id?: string
          state?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          access_level_id: string | null
          can_open_caixa: boolean
          id: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          user_id: string
        }
        Insert: {
          access_level_id?: string | null
          can_open_caixa?: boolean
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          salon_id: string
          user_id: string
        }
        Update: {
          access_level_id?: string | null
          can_open_caixa?: boolean
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          salon_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_access_level_id_fkey"
            columns: ["access_level_id"]
            isOneToOne: false
            referencedRelation: "access_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_salon_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "receptionist"
        | "financial"
        | "professional"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "no_show"
        | "cancelled"
      payment_method: "cash" | "pix" | "credit_card" | "debit_card" | "other"
      stock_movement_type: "entry" | "exit" | "adjustment"
      transaction_type: "income" | "expense"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "receptionist",
        "financial",
        "professional",
      ],
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "no_show",
        "cancelled",
      ],
      payment_method: ["cash", "pix", "credit_card", "debit_card", "other"],
      stock_movement_type: ["entry", "exit", "adjustment"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
