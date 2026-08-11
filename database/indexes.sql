-- Execute this SQL in your Supabase SQL Editor (SQL Editor -> New Query -> Run)

-- 1. Drop existing function if parameter names differ, then recreate
DROP FUNCTION IF EXISTS public.decrement_stock(UUID, INT);
DROP FUNCTION IF EXISTS public.decrement_stock(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.decrement_stock(inv_id UUID, amount INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.menu_items
  SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - amount)
  WHERE id = inv_id AND track_inventory = true;
END;
$$;

-- Grant permissions for RPC execution
GRANT EXECUTE ON FUNCTION public.decrement_stock(UUID, INT) TO anon, authenticated, service_role;


-- 2. Database Performance Indexes
CREATE INDEX IF NOT EXISTS idx_temporary_items_table_id ON public.temporary_items (table_id);
CREATE INDEX IF NOT EXISTS idx_temporary_items_table_created ON public.temporary_items (table_id, created_at);

CREATE INDEX IF NOT EXISTS idx_tables_status ON public.tables (status);
CREATE INDEX IF NOT EXISTS idx_tables_created_at ON public.tables (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bills_table_id ON public.bills (table_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills (status);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON public.bills (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items (bill_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items (category);
