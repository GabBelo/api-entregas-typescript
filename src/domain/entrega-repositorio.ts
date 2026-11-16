import type { Entrega } from "./entrega";

// Porta de saída: o domínio define o que precisa; a infraestrutura implementa
// (em memória nos testes, Postgres/SQL Server em produção).
export interface EntregaRepositorio {
  proximoId(): Promise<number>;
  salvar(entrega: Entrega): Promise<void>;
  buscarPorId(id: number): Promise<Entrega | null>;
  buscarPorNotaFiscal(notaFiscal: string): Promise<Entrega | null>;
  /** Paginação keyset: retorna até `limite` entregas com id > `aposId`. */
  listar(filtro: { aposId?: number; limite: number; status?: Entrega["status"] }): Promise<Entrega[]>;
}
