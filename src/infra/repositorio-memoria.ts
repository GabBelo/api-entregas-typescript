import type { Entrega } from "../domain/entrega";
import type { EntregaRepositorio } from "../domain/entrega-repositorio";

// Adaptador em memória: usado nos testes e no modo demo.
// Em produção, outro adaptador (Postgres/SQL Server) implementa a mesma interface.
export class RepositorioEmMemoria implements EntregaRepositorio {
  private readonly dados = new Map<number, Entrega>();
  private seq = 0;

  async proximoId() {
    return ++this.seq;
  }

  async salvar(entrega: Entrega) {
    this.dados.set(entrega.id, structuredClone(entrega));
  }

  async buscarPorId(id: number) {
    const e = this.dados.get(id);
    return e ? structuredClone(e) : null;
  }

  async buscarPorNotaFiscal(notaFiscal: string) {
    for (const e of this.dados.values()) if (e.notaFiscal === notaFiscal) return structuredClone(e);
    return null;
  }

  async listar({ aposId = 0, limite, status }: { aposId?: number; limite: number; status?: Entrega["status"] }) {
    return [...this.dados.values()]
      .filter((e) => e.id > aposId && (!status || e.status === status))
      .sort((a, b) => a.id - b.id)
      .slice(0, limite)
      .map((e) => structuredClone(e));
  }
}
