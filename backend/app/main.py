from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import category, product, upload, order, auth, supplier, telegram_auth, favorite, cart, review, stock_movement, expense, employee, home_banner, dual_slide, social_preview, support, bot_conversation, promo_code

import os

# на Render (переменная RENDER ставится автоматически) документация API скрыта, локально — открыта
_ON_RENDER = bool(os.getenv("RENDER"))
app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url=None if _ON_RENDER else "/docs",
    redoc_url=None if _ON_RENDER else "/redoc",
    openapi_url=None if _ON_RENDER else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(category.router)
app.include_router(product.router)
app.include_router(upload.router)
app.include_router(order.router)
app.include_router(auth.router)
app.include_router(supplier.router)
app.include_router(telegram_auth.router)
app.include_router(favorite.router)
app.include_router(cart.router)
app.include_router(review.router)
app.include_router(review.homepage_router)
app.include_router(stock_movement.router)
app.include_router(expense.router)
app.include_router(employee.router)
app.include_router(home_banner.router)
app.include_router(dual_slide.router)
app.include_router(social_preview.router)
app.include_router(support.router)
app.include_router(bot_conversation.router)
app.include_router(promo_code.router)


@app.get("/health")
def health():
    return {"status": "ok", "project": settings.PROJECT_NAME}

import asyncio
from app.services.auto_cancel import auto_cancel_loop


@app.on_event("startup")
async def start_auto_cancel():
    app.state.auto_cancel_task = asyncio.create_task(auto_cancel_loop())
