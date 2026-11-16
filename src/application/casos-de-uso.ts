// Casos de uso: orquestram domínio + repositório. Recebem dependências por parâmetro
// (injeção simples), o que permite testar sem banco.
import type { CriarEntregaInput, EventoInput, ListarQuery } from "../contracts/entrega";
import { type Entrega, RegraDeNegocioError, registrarEvento } from "../domain/entrega";
import type { EntregaRepositorio } from "../domain/entrega-repositorio";

export class NaoEncontradoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NaoEncontradoError";
  }
}

export function criarCasosDeUso(repo: EntregaRepositorio, agora: () => Date = () => new Date()) {
  return {
    async criar(input: CriarEntregaInput): Promise<Entrega> {
      if (await repo.buscarPorNotaFiscal(input.notaFiscal)) {
        throw new RegraDeNegocioError(`Já existe entrega para a NF ${input.notaFiscal}`);
      }
      const entrega: Entrega = {
        id: await repo.proximoId(),
        notaFiscal: input.notaFiscal,
        ufDestino: input.ufDestino,
        pesoKg: input.pesoKg,
        status: "CRIADA",
        eventos: [],
        criadaEm: agora(),
      };
      await repo.salvar(entrega);
      return entrega;
    },

    async registrarEvento(id: number, input: EventoInput): Promise<Entrega> {
      const entrega = await repo.buscarPorId(id);
      if (!entrega) throw new NaoEncontradoError(`Entrega ${id} não encontrada`);
      const atualizada = registrarEvento(entrega, {
        status: input.status,
        ocorridoEm: input.ocorridoEm ? new Date(input.ocorridoEm) : agora(),
        observacao: input.observacao,
      });
      await repo.salvar(atualizada);
      return atualizada;
    },

    async buscar(id: number): Promise<Entrega> {
      const entrega = await repo.buscarPorId(id);
      if (!entrega) throw new NaoEncontradoError(`Entrega ${id} não encontrada`);
      return entrega;
    },

    async listar(query: ListarQuery) {
      const itens = await repo.listar({ aposId: query.aposId, limite: query.limite, status: query.status });
      const proximo = itens.length === query.limite ? itens.at(-1)?.id : undefined;
      return { itens, proximoAposId: proximo ?? null };
    },
  };
}

export type CasosDeUso = ReturnType<typeof criarCasosDeUso>;
