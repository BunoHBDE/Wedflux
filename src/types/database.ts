// Subconjunto dos tipos gerados pelo Supabase (projeto nhfujhpteolhndsyqsys): só o que a etapa 1 usa.
// Para regenerar o arquivo completo: `supabase gen types typescript --project-id nhfujhpteolhndsyqsys`.

export type PartnerRole = 'noiva' | 'noivo' | 'outro';
export type MemberRole = 'owner' | 'partner';
export type WeddingStyle = 'so_necessario' | 'minimalista' | 'completo';
export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'billing_issue' | 'expired';

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: Row<{
        user_id: string;
        display_name: string | null;
        partner_role: PartnerRole | null;
        acquisition_source: string | null;
        notify_payments: boolean;
        notify_decisions: boolean;
        deletion_requested_at: string | null;
      }>;
      weddings: Row<{
        id: string;
        owner_id: string;
        wedding_date: string;
        date_is_approximate: boolean;
        guest_count: number | null;
        total_budget: number;
        style: WeddingStyle;
        is_destination: boolean;
      }>;
      wedding_members: Row<{
        wedding_id: string;
        user_id: string;
        role: MemberRole;
        joined_at: string;
      }>;
      subscriptions: Row<{
        wedding_id: string;
        status: SubscriptionStatus;
        entitlement_expires_at: string | null;
      }>;
    };
    Views: {
      wedding_summary: {
        Row: {
          wedding_id: string | null;
          total_budget: number | null;
          contracted_total: number | null;
          paid_total: number | null;
          remaining_to_pay: number | null;
          budget_remaining: number | null;
          items_total: number | null;
          items_to_decide: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_wedding: {
        Args: {
          p_wedding_date: string;
          p_style: WeddingStyle;
          p_is_destination: boolean;
          p_total_budget: number;
          p_guest_count?: number;
          p_date_is_approximate?: boolean;
          p_concerns?: string[];
          p_usage_goals?: string[];
          p_already_hired?: boolean;
          p_contracted_catalog_item_ids?: number[];
          p_display_name?: string;
          p_role?: PartnerRole;
          p_acquisition_source?: string;
        };
        Returns: string;
      };
      create_invite: { Args: Record<string, never>; Returns: string };
      accept_invite: { Args: { p_code: string }; Returns: string };
      transfer_ownership: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: {
      partner_role: PartnerRole;
      member_role: MemberRole;
      wedding_style: WeddingStyle;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
