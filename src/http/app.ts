// Camada HTTP: Elysia valida a entrada com os schemas Zod do contrato
// e traduz erros de domínio em status HTTP. Nenhuma regra de negócio aqui.
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { type CasosDeUso, NaoEncontradoError } from "../application/casos-de-uso";
import { criarEntregaSchema, eventoSchema, idParamSchema, listarQuerySchema } from "../contracts/entrega";
import { type Entrega, leadTimeHoras, RegraDeNegocioError } from "../domain/entrega";

const paraResposta = (e: Entrega) => ({ ...e, leadTimeHoras: leadTimeHoras(e) });

export function criarApp(casos: CasosDeUso) {
  return new Elysia()
    .use(openapi({ documentation: { info: { title: "API de Entregas", version: "1.0.0" } } }))
    .error({ RegraDeNegocioError, NaoEncontradoError })
    .onError(({ code, error, set }) => {
      if (code === "NaoEncontradoError") {
        set.status = 404;
        return { erro: error.message };
      }
      if (code === "RegraDeNegocioError") {
        set.status = 422;
        return { erro: error.message };
      }
      if (code === "VALIDATION") {
        set.status = 400;
        return { erro: "Requisição inválida", detalhes: error.all.map((e) => e.summary ?? e.message) };
      }
    })
    .get("/saude", () => ({ status: "ok" }))
    .post("/entregas", async ({ body, set }) => {
      set.status = 201;
      return paraResposta(await casos.criar(body));
    }, { body: criarEntregaSchema })
    .get("/entregas", async ({ query }) => {
      const r = await casos.listar(query);
      return { ...r, itens: r.itens.map(paraResposta) };
    }, { query: listarQuerySchema })
    .get("/entregas/:id", async ({ params }) => paraResposta(await casos.buscar(params.id)), {
      params: idParamSchema,
    })
    .post("/entregas/:id/eventos", async ({ params, body }) =>
      paraResposta(await casos.registrarEvento(params.id, body)), {
      params: idParamSchema,
      body: eventoSchema,
    });
}

export type App = ReturnType<typeof criarApp>;
