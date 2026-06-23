import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.database import init_db
from app.logging_config import configure_logging
from app.routers import accounts, health

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("Accounts service started")
    yield
    logger.info("Accounts service stopped")


tags_metadata = [
    {"name": "accounts", "description": "Creación y consulta de cuentas, saldo, créditos/débitos idempotentes y ledger."},
    {"name": "health", "description": "Endpoints de salud para orquestadores y health checks de Docker."},
]

app = FastAPI(
    title="Accounts Service",
    description=(
        "Microservicio de gestión de cuentas: saldo, créditos/débitos idempotentes y ledger.\n\n"
        "Documentación interactiva (Swagger UI) disponible en `/docs` y especificación OpenAPI en `/openapi.json`."
    ),
    version="1.0.0",
    contact={"name": "Fintech Hackathon", "url": "https://github.com"},
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "request handled",
        extra={
            "extra_fields": {
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        },
    )
    return response


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


app.include_router(health.router)
app.include_router(accounts.router)
