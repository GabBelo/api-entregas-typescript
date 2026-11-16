// Contrato único (Zod): valida a entrada da API e gera os tipos usados no código.
import { z } from "zod";
import { STATUS } from "../domain/entrega";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"] as const;

export const criarEntregaSchema = z.object({
  notaFiscal: z.string().regex(/^\d{1,9}$/, "Número da NF deve ter de 1 a 9 dígitos"),
  ufDestino: z.enum(UFS),
  pesoKg: z.number().positive().max(60_000),
});

export const eventoSchema = z.object({
  status: z.enum(STATUS),
  ocorridoEm: z.iso.datetime({ offset: true }).optional(),
  observacao: z.string().max(500).optional(),
});

export const listarQuerySchema = z.object({
  aposId: z.coerce.number().int().positive().optional(),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(STATUS).optional(),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export type CriarEntregaInput = z.infer<typeof criarEntregaSchema>;
export type EventoInput = z.infer<typeof eventoSchema>;
export type ListarQuery = z.infer<typeof listarQuerySchema>;
