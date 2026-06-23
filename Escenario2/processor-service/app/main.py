import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.database import init_db
from app.logging_config import configure_logging
from app.reconciliation import reconciliation_loop
from app.routers import health, transactions

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    stop_event = asyncio.Event()
    task = asyncio.create_task(reconciliation_loop(stop_event))
    logger.info("Processor service started")
    yield
    stop_event.set()
    await task
    logger.info("Processor service stopped")


tags_metadata = [
    {"name": "transactions", "description": "Recargas y transferencias P2P (patrón Saga) y su consulta."},
    {"name": "health", "description": "Endpoints de salud para orquestadores y health checks de Docker."},
]

app = FastAPI(
    title="Processor Service",
    description=(
        "Microservicio de procesamiento: recargas, transferencias P2P (patrón Saga) y reconciliación.\n\n"
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
app.include_router(transactions.router)
