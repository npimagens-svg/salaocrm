-- Migration: Kits de Produtos (product_kits + product_kit_items)
-- Criado em 2026-05-11.
-- Kit = agregado virtual de N produtos com desconto único. Vendido como linha única
-- na comanda (item_type='kit'), mas estoque baixa nos SKUs individuais e comissão
-- é rateada usando products.commission_percent de cada item.

-- ============================================================================
-- 1. Tabela principal de kits
-- ============================================================================

CREATE TABLE public.product_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_kits_salon ON public.product_kits(salon_id);
CREATE INDEX idx_product_kits_active ON public.product_kits(salon_id, is_active);

-- Trigger updated_at (reusa função existente)
CREATE TRIGGER product_kits_updated_at
  BEFORE UPDATE ON public.product_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. Junction kit ↔ produtos
-- ============================================================================

CREATE TABLE public.product_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID REFERENCES public.product_kits(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kit_id, product_id)
);

CREATE INDEX idx_product_kit_items_kit ON public.product_kit_items(kit_id);
CREATE INDEX idx_product_kit_items_product ON public.product_kit_items(product_id);

-- ============================================================================
-- 3. Coluna kit_id em comanda_items
-- ============================================================================

ALTER TABLE public.comanda_items
  ADD COLUMN kit_id UUID REFERENCES public.product_kits(id) ON DELETE SET NULL;

CREATE INDEX idx_comanda_items_kit_id ON public.comanda_items(kit_id)
  WHERE kit_id IS NOT NULL;

COMMENT ON COLUMN public.comanda_items.kit_id IS
  'Quando item_type=kit, aponta para product_kits. service_id e product_id ficam NULL.';

-- ============================================================================
-- 4. RLS - product_kits (padrão idêntico ao products)
-- ============================================================================

ALTER TABLE public.product_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product kits in their salon"
  ON public.product_kits FOR SELECT
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can insert product kits in their salon"
  ON public.product_kits FOR INSERT
  TO authenticated
  WITH CHECK (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can update product kits in their salon"
  ON public.product_kits FOR UPDATE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Users can delete product kits in their salon"
  ON public.product_kits FOR DELETE
  TO authenticated
  USING (salon_id = public.get_user_salon_id(auth.uid()));

-- ============================================================================
-- 5. RLS - product_kit_items (via EXISTS no kit pai)
-- ============================================================================

ALTER TABLE public.product_kit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kit items in their salon"
  ON public.product_kit_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.product_kits k
    WHERE k.id = kit_id AND k.salon_id = public.get_user_salon_id(auth.uid())
  ));

CREATE POLICY "Users can insert kit items in their salon"
  ON public.product_kit_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.product_kits k
    WHERE k.id = kit_id AND k.salon_id = public.get_user_salon_id(auth.uid())
  ));

CREATE POLICY "Users can update kit items in their salon"
  ON public.product_kit_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.product_kits k
    WHERE k.id = kit_id AND k.salon_id = public.get_user_salon_id(auth.uid())
  ));

CREATE POLICY "Users can delete kit items in their salon"
  ON public.product_kit_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.product_kits k
    WHERE k.id = kit_id AND k.salon_id = public.get_user_salon_id(auth.uid())
  ));
