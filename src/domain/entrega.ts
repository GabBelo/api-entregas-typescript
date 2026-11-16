// Domínio: a entrega e as regras de transição de status.
// Não conhece HTTP, banco nem framework — só regra de negócio.

export const STATUS = ["CRIADA", "COLETADA", "EM_TRANSITO", "EM_ENTREGA", "ENTREGUE", "DEVOLVIDA"] as const;
export type Status = (typeof STATUS)[number];

// Máquina de estados: de cada status, para quais é permitido ir.
const TRANSICOES: Record<Status, readonly Status[]> = {
  CRIADA: ["COLETADA"],
  COLETADA: ["EM_TRANSITO"],
  EM_TRANSITO: ["EM_ENTREGA", "DEVOLVIDA"],
  EM_ENTREGA: ["ENTREGUE", "EM_TRANSITO", "DEVOLVIDA"],
  ENTREGUE: [],
  DEVOLVIDA: [],
};

export interface Evento {
  status: Status;
  ocorridoEm: Date;
  observacao?: string;
}

export interface Entrega {
  id: number;
  notaFiscal: string;
  ufDestino: string;
  pesoKg: number;
  status: Status;
  eventos: Evento[];
  criadaEm: Date;
}

export class RegraDeNegocioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegraDeNegocioError";
  }
}

export function podeTransitar(de: Status, para: Status): boolean {
  return TRANSICOES[de].includes(para);
}

/** Aplica um novo evento à entrega, validando a transição e a ordem cronológica. */
export function registrarEvento(entrega: Entrega, evento: Evento): Entrega {
  if (!podeTransitar(entrega.status, evento.status)) {
    throw new RegraDeNegocioError(`Transição inválida: ${entrega.status} → ${evento.status}`);
  }
  const ultimo = entrega.eventos.at(-1);
  if (ultimo && evento.ocorridoEm < ultimo.ocorridoEm) {
    throw new RegraDeNegocioError("O evento não pode ser anterior ao último evento registrado");
  }
  return { ...entrega, status: evento.status, eventos: [...entrega.eventos, evento] };
}

/** Lead time em horas entre a criação e a entrega (null se ainda não entregue). */
export function leadTimeHoras(entrega: Entrega): number | null {
  const entregue = entrega.eventos.find((e) => e.status === "ENTREGUE");
  if (!entregue) return null;
  return Math.round(((entregue.ocorridoEm.getTime() - entrega.criadaEm.getTime()) / 36e5) * 10) / 10;
}
