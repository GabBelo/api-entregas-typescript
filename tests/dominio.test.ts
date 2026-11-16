import { describe, expect, test } from "bun:test";
import { type Entrega, leadTimeHoras, podeTransitar, RegraDeNegocioError, registrarEvento } from "../src/domain/entrega";

const base = (): Entrega => ({
  id: 1,
  notaFiscal: "123",
  ufDestino: "SC",
  pesoKg: 100,
  status: "CRIADA",
  eventos: [],
  criadaEm: new Date("2026-03-01T08:00:00Z"),
});

describe("máquina de estados", () => {
  test("segue o fluxo normal até ENTREGUE", () => {
    let e = base();
    for (const [status, hora] of [["COLETADA", 10], ["EM_TRANSITO", 12], ["EM_ENTREGA", 30], ["ENTREGUE", 32]] as const) {
      e = registrarEvento(e, { status, ocorridoEm: new Date(`2026-03-0${hora >= 24 ? 2 : 1}T${String(hora % 24).padStart(2, "0")}:00:00Z`) });
    }
    expect(e.status).toBe("ENTREGUE");
    expect(e.eventos).toHaveLength(4);
  });

  test("não permite pular etapas", () => {
    expect(() => registrarEvento(base(), { status: "ENTREGUE", ocorridoEm: new Date() })).toThrow(RegraDeNegocioError);
  });

  test("status finais não aceitam novos eventos", () => {
    expect(podeTransitar("ENTREGUE", "EM_TRANSITO")).toBe(false);
    expect(podeTransitar("DEVOLVIDA", "COLETADA")).toBe(false);
  });

  test("permite voltar de EM_ENTREGA para EM_TRANSITO (tentativa frustrada)", () => {
    expect(podeTransitar("EM_ENTREGA", "EM_TRANSITO")).toBe(true);
  });

  test("rejeita evento anterior ao último registrado", () => {
    const coletada = registrarEvento(base(), { status: "COLETADA", ocorridoEm: new Date("2026-03-01T10:00:00Z") });
    expect(() =>
      registrarEvento(coletada, { status: "EM_TRANSITO", ocorridoEm: new Date("2026-03-01T09:00:00Z") }),
    ).toThrow("anterior");
  });
});

describe("lead time", () => {
  test("é null enquanto não entregue", () => {
    expect(leadTimeHoras(base())).toBeNull();
  });

  test("conta as horas entre a criação e a entrega", () => {
    const e = { ...base(), eventos: [{ status: "ENTREGUE" as const, ocorridoEm: new Date("2026-03-02T20:00:00Z") }] };
    expect(leadTimeHoras(e)).toBe(36);
  });
});
