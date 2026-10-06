-- Migration: Atomic Finalize Bill Transaction Function
-- Allows POS to finalize bills with 1 single atomic database call

CREATE OR REPLACE FUNCTION public.finalize_bill_transaction(
  p_table_id UUID,
  p_table_name TEXT,
  p_section TEXT,
  p_subtotal NUMERIC,
  p_tax_amount NUMERIC,
  p_total_amount NUMERIC,
  p_payment_type TEXT,
  p_status TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bill_id UUID;
  v_bill JSONB;
  v_item RECORD;
BEGIN
  -- 1. Insert into bills
  INSERT INTO public.bills (
    table_id, table_name, section, subtotal, tax_amount, total_amount, payment_type, status
  ) VALUES (
    p_table_id, p_table_name, p_section, p_subtotal, COALESCE(p_tax_amount, 0), p_total_amount, p_payment_type, COALESCE(p_status, 'printed')
  )
  RETURNING id INTO v_bill_id;

  -- 2. Insert bill items and decrement stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (
    id UUID,
    name TEXT,
    category TEXT,
    price NUMERIC,
    quantity INT
  )
  LOOP
    INSERT INTO public.bill_items (
      bill_id, item_id, item_name, item_category, quantity, price, total
    ) VALUES (
      v_bill_id, v_item.id, v_item.name, v_item.category, v_item.quantity, v_item.price, (v_item.price * v_item.quantity)
    );

    -- Decrement stock if track_inventory is enabled
    UPDATE public.menu_items
    SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - v_item.quantity)
    WHERE id = v_item.id AND track_inventory = true;
  END LOOP;

  -- 3. Clear temporary items for this table if table_id is provided
  IF p_table_id IS NOT NULL THEN
    DELETE FROM public.temporary_items WHERE table_id = p_table_id;
    
    -- 4. Update table status
    UPDATE public.tables
    SET status = CASE WHEN p_status = 'paid' THEN 'blank' ELSE 'printed' END,
        updated_at = NOW()
    WHERE id = p_table_id;
  END IF;

  SELECT to_jsonb(b.*) INTO v_bill FROM public.bills b WHERE b.id = v_bill_id;
  RETURN v_bill;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_bill_transaction TO anon, authenticated, service_role;
