from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import category, product, upload, order, auth, supplier, telegram_auth, favorite, cart, review, stock_movement, quick_draft, expense

app = FastAPI(title=settings.PROJECT_NAME)

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
app.include_router(stock_movement.router)
app.include_router(quick_draft.router)
app.include_router(expense.router)


@app.get("/health")
def health():
    return {"status": "ok", "project": settings.PROJECT_NAME}