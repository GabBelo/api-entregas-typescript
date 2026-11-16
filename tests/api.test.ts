import { beforeEach, describe, expect, test } from "bun:test";
import { criarCasosDeUso } from "../src/application/casos-de-uso";
import { type App, criarApp } from "../src/http/app";
import { RepositorioEmMemoria } from "../src/infra/repositorio-memoria";

let app: App;

beforeEach(() => {
  let relogio = new Date("2026-03-01T08:00:00Z").getTime();
  const agora = () => new Date((relogio += 60_000)); // cada chamada avança 1 minuto
  app = criarApp(criarCasosDeUso(new RepositorioEmMemoria(), agora));
});

const chamar = async (metodo: string, caminho: string, corpo?: unknown) => {
  const res = await app.handle(
    new Request(`http://localhost${caminho}`, {
      method: metodo,
      headers: { "content-type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
    }),
  );
  return { status: res.status, json: (await res.json()) as any };
};

const novaEntrega = (nf = "1001") => chamar("POST", "/entregas", { notaFiscal: nf, ufDestino: "SC", pesoKg: 250 });

describe("POST /entregas", () => {
  test("cria a entrega com status CRIADA", async () => {
    const { status, json } = await novaEntrega();
    expect(status).toBe(201);
    expect(json).toMatchObject({ id: 1, status: "CRIADA", leadTimeHoras: null });
  });

  test("valida o corpo com o contrato Zod", async () => {
    const { status, json } = await chamar("POST", "/entregas", { notaFiscal: "abc", ufDestino: "XX", pesoKg: -1 });
    expect(status).toBe(400);
    expect(json.erro).toBe("Requisição inválida");
  });

  test("não aceita NF duplicada", async () => {
    await novaEntrega("555");
    const { status } = await novaEntrega("555");
    expect(status).toBe(422);
  });
});

describe("POST /entregas/:id/eventos", () => {
  test("percorre o fluxo e calcula o lead time", async () => {
    await novaEntrega();
    for (const s of ["COLETADA", "EM_TRANSITO", "EM_ENTREGA"]) {
      await chamar("POST", "/entregas/1/eventos", { status: s });
    }
    const { status, json } = await chamar("POST", "/entregas/1/eventos", {
      status: "ENTREGUE",
      ocorridoEm: "2026-03-02T20:01:00Z",
    });
    expect(status).toBe(200);
    expect(json.status).toBe("ENTREGUE");
    expect(json.leadTimeHoras).toBe(36);
  });

  test("422 para transição inválida", async () => {
    await novaEntrega();
    const { status, json } = await chamar("POST", "/entregas/1/eventos", { status: "ENTREGUE" });
    expect(status).toBe(422);
    expect(json.erro).toContain("CRIADA → ENTREGUE");
  });

  test("404 para entrega inexistente", async () => {
    const { status } = await chamar("POST", "/entregas/99/eventos", { status: "COLETADA" });
    expect(status).toBe(404);
  });
});

describe("GET /entregas", () => {
  test("pagina por keyset e filtra por status", async () => {
    for (let i = 1; i <= 5; i++) await novaEntrega(String(2000 + i));
    await chamar("POST", "/entregas/2/eventos", { status: "COLETADA" });

    const pag1 = await chamar("GET", "/entregas?limite=2");
    expect(pag1.json.itens.map((e: any) => e.id)).toEqual([1, 2]);
    expect(pag1.json.proximoAposId).toBe(2);

    const pag2 = await chamar("GET", `/entregas?limite=2&aposId=${pag1.json.proximoAposId}`);
    expect(pag2.json.itens.map((e: any) => e.id)).toEqual([3, 4]);

    const coletadas = await chamar("GET", "/entregas?status=COLETADA");
    expect(coletadas.json.itens).toHaveLength(1);
    expect(coletadas.json.proximoAposId).toBeNull();
  });
});
