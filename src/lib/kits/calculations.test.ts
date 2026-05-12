import { describe, it, expect } from "vitest";
import { calculateKit, allocateKitPrice, type KitCalcItem } from "./calculations";

const mkItem = (qty: number, sale: number, cost: number): KitCalcItem => ({
  quantity: qty,
  product: { sale_price: sale, cost_price: cost },
});

describe("calculateKit", () => {
  it("calcula corretamente com desconto 0%", () => {
    const items = [mkItem(1, 50, 20), mkItem(1, 50, 20), mkItem(1, 80, 30)];
    const r = calculateKit(items, 0);

    expect(r.subtotal).toBe(180);
    expect(r.finalPrice).toBe(180);
    expect(r.costTotal).toBe(70);
    expect(r.savings).toBe(0);
    // margem: (180 - 70) / 180 = 0.6111... = 61.11%
    expect(r.marginPercent).toBe(61.11);
  });

  it("calcula corretamente com desconto 15% (cenário Kit Long & Strong)", () => {
    const items = [mkItem(1, 50, 20), mkItem(1, 50, 20), mkItem(1, 80, 30)];
    const r = calculateKit(items, 15);

    expect(r.subtotal).toBe(180);
    expect(r.finalPrice).toBe(153); // 180 * 0.85
    expect(r.costTotal).toBe(70);
    expect(r.savings).toBe(27);
    // margem: (153 - 70) / 153 = 0.5424 = 54.25%
    expect(r.marginPercent).toBe(54.25);
  });

  it("permite desconto 100% (kit brinde) com margem negativa", () => {
    const items = [mkItem(1, 50, 20), mkItem(1, 80, 30)];
    const r = calculateKit(items, 100);

    expect(r.finalPrice).toBe(0);
    expect(r.savings).toBe(130);
    // finalPrice = 0 → margem default 0
    expect(r.marginPercent).toBe(0);
  });

  it("retorna zeros pra lista vazia", () => {
    const r = calculateKit([], 20);

    expect(r.subtotal).toBe(0);
    expect(r.finalPrice).toBe(0);
    expect(r.costTotal).toBe(0);
    expect(r.marginPercent).toBe(0);
    expect(r.savings).toBe(0);
  });

  it("trabalha com 1 item só + quantidade > 1", () => {
    // 3 unidades de shampoo R$50 (custo R$20), desconto 10%
    const r = calculateKit([mkItem(3, 50, 20)], 10);

    expect(r.subtotal).toBe(150);
    expect(r.finalPrice).toBe(135);
    expect(r.costTotal).toBe(60);
    expect(r.savings).toBe(15);
    // (135 - 60) / 135 = 0.5555 = 55.56%
    expect(r.marginPercent).toBe(55.56);
  });

  it("clampa desconto negativo pra 0", () => {
    const items = [mkItem(1, 100, 40)];
    const r = calculateKit(items, -10);
    expect(r.finalPrice).toBe(100);
  });

  it("clampa desconto > 100 pra 100", () => {
    const items = [mkItem(1, 100, 40)];
    const r = calculateKit(items, 150);
    expect(r.finalPrice).toBe(0);
  });

  it("lida com preços fracionados (custo R$ menor que cents)", () => {
    // produto custou R$0,33 unidade, vendido a R$1,99
    // 19.9 * 0.95 = 18.905 → ponto flutuante arredonda pra 18.9 (banker's)
    const items = [mkItem(10, 1.99, 0.33)];
    const r = calculateKit(items, 5);
    expect(r.subtotal).toBe(19.9);
    expect(r.finalPrice).toBeCloseTo(18.91, 1); // tolera ±0.05 por arredondamento float
    expect(r.costTotal).toBe(3.3);
  });
});

describe("allocateKitPrice", () => {
  it("ratea o finalPrice proporcionalmente aos pesos dos itens", () => {
    // Sh 50 + Cond 50 + Másc 80 = 180, desconto 15% → final 153
    // Pesos: 50/180, 50/180, 80/180
    // Rateado: 42.50, 42.50, 68.00
    const items = [mkItem(1, 50, 20), mkItem(1, 50, 20), mkItem(1, 80, 30)];
    const result = allocateKitPrice(items, 15);

    expect(result).toHaveLength(3);
    expect(result[0].allocatedAmount).toBe(42.5);
    expect(result[1].allocatedAmount).toBe(42.5);
    expect(result[2].allocatedAmount).toBe(68.0);
  });

  it("soma dos rateios é EXATAMENTE igual ao finalPrice (sem centavo perdido)", () => {
    // Cenário com arredondamento: 1/3 = 0.333..., 3 itens iguais
    const items = [mkItem(1, 33.33, 10), mkItem(1, 33.33, 10), mkItem(1, 33.34, 10)];
    const result = allocateKitPrice(items, 10);
    const { finalPrice } = calculateKit(items, 10);

    const sum = result.reduce((s, a) => s + a.allocatedAmount, 0);
    expect(Math.round(sum * 100) / 100).toBe(finalPrice);
  });

  it("retorna array vazio pra lista sem itens", () => {
    expect(allocateKitPrice([], 10)).toEqual([]);
  });

  it("aplica desconto 0% (rateio == preço original)", () => {
    const items = [mkItem(1, 50, 20), mkItem(1, 50, 20)];
    const result = allocateKitPrice(items, 0);
    expect(result[0].allocatedAmount).toBe(50);
    expect(result[1].allocatedAmount).toBe(50);
  });

  it("aplica desconto 100% (todos rateados ficam 0)", () => {
    const items = [mkItem(1, 50, 20), mkItem(1, 80, 30)];
    const result = allocateKitPrice(items, 100);
    expect(result[0].allocatedAmount).toBe(0);
    expect(result[1].allocatedAmount).toBe(0);
  });
});
