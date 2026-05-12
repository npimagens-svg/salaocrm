/**
 * Cálculos de Kit de Produtos.
 *
 * Kit = agregado virtual de N produtos com desconto único.
 * Preço final = soma dos preços individuais com % desconto aplicado.
 * Valores sempre calculados on-the-fly (não armazenados) pra refletir
 * automaticamente mudanças nos preços individuais dos produtos.
 */

export interface KitCalcProduct {
  sale_price: number;
  cost_price: number;
}

export interface KitCalcItem {
  quantity: number;
  product: KitCalcProduct;
}

export interface KitCalc {
  /** Soma dos preços individuais (sem desconto) */
  subtotal: number;
  /** Preço final após desconto */
  finalPrice: number;
  /** Soma dos custos individuais */
  costTotal: number;
  /** Margem percentual: ((finalPrice - costTotal) / finalPrice) * 100 */
  marginPercent: number;
  /** Economia em reais (subtotal - finalPrice) */
  savings: number;
}

/**
 * Calcula valores derivados de um kit.
 *
 * @param items Lista de itens do kit (quantidade + produto com preços)
 * @param discountPercent Desconto a aplicar (0-100). Valores fora desse range são clamped.
 */
export function calculateKit(
  items: KitCalcItem[],
  discountPercent: number
): KitCalc {
  // Clamp do desconto pra [0, 100]
  const discount = Math.min(Math.max(discountPercent, 0), 100);

  const subtotal = items.reduce(
    (sum, i) => sum + i.quantity * i.product.sale_price,
    0
  );
  const costTotal = items.reduce(
    (sum, i) => sum + i.quantity * i.product.cost_price,
    0
  );
  const finalPrice = round2(subtotal * (1 - discount / 100));
  const savings = round2(subtotal - finalPrice);
  const marginPercent =
    finalPrice > 0 ? round2(((finalPrice - costTotal) / finalPrice) * 100) : 0;

  return {
    subtotal: round2(subtotal),
    finalPrice,
    costTotal: round2(costTotal),
    marginPercent,
    savings,
  };
}

/**
 * Rateia o preço final do kit proporcionalmente entre os produtos
 * (baseado no peso de cada um no subtotal).
 *
 * Usado pra calcular comissão por produto: cada produto comissiona sobre
 * o valor rateado, usando sua `commission_percent` própria.
 *
 * @returns Array de { product, allocatedAmount } em ordem dos items recebidos.
 *          Soma dos allocatedAmount == finalPrice (com tolerância de 1 centavo
 *          absorvida pelo último item).
 */
export function allocateKitPrice(
  items: KitCalcItem[],
  discountPercent: number
): Array<{ item: KitCalcItem; allocatedAmount: number }> {
  const { subtotal, finalPrice } = calculateKit(items, discountPercent);

  if (items.length === 0 || subtotal === 0) return [];

  const allocations = items.map((item) => {
    const itemTotal = item.quantity * item.product.sale_price;
    const weight = itemTotal / subtotal;
    return { item, allocatedAmount: round2(weight * finalPrice) };
  });

  // Reconciliação: ajusta último item pra eliminar centavos perdidos
  // por arredondamento, garantindo SUM(allocations) === finalPrice exato.
  const allocatedSum = allocations.reduce((s, a) => s + a.allocatedAmount, 0);
  const diff = round2(finalPrice - allocatedSum);
  if (diff !== 0 && allocations.length > 0) {
    allocations[allocations.length - 1].allocatedAmount = round2(
      allocations[allocations.length - 1].allocatedAmount + diff
    );
  }

  return allocations;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
