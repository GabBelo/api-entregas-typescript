import { criarCasosDeUso } from "./application/casos-de-uso";
import { criarApp } from "./http/app";
import { RepositorioEmMemoria } from "./infra/repositorio-memoria";

const porta = Number(process.env.PORT ?? 3000);
const app = criarApp(criarCasosDeUso(new RepositorioEmMemoria())).listen(porta);

console.log(`API de entregas em http://localhost:${app.server?.port} · docs em /openapi`);
