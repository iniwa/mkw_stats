import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import VrAccount
from app.schemas import VrAccountCreate, VrAccountRead, VrAccountUpdate

router = APIRouter(prefix="/api/v1", tags=["vr-accounts"])


def _get_account(db: Session, account_id: uuid.UUID) -> VrAccount:
    account = db.get(VrAccount, account_id)
    if account is None:
        raise HTTPException(404, f"vr account not found: {account_id}")
    return account


@router.get("/vr-accounts", response_model=list[VrAccountRead])
def list_vr_accounts(db: Session = Depends(get_db)) -> list[VrAccount]:
    return list(
        db.scalars(select(VrAccount).order_by(VrAccount.sort_order, VrAccount.name))
    )


@router.post("/vr-accounts", response_model=VrAccountRead, status_code=status.HTTP_201_CREATED)
def create_vr_account(
    payload: VrAccountCreate, db: Session = Depends(get_db)
) -> VrAccount:
    if db.scalars(select(VrAccount).where(VrAccount.name == payload.name)).first():
        raise HTTPException(409, f"vr account name already exists: {payload.name}")
    account = VrAccount(
        name=payload.name,
        display_name=payload.display_name,
        initial_vr=payload.initial_vr,
        current_vr=payload.current_vr if payload.current_vr is not None else payload.initial_vr,
        sort_order=payload.sort_order,
        is_active=False,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.patch("/vr-accounts/{account_id}", response_model=VrAccountRead)
def update_vr_account(
    account_id: uuid.UUID, payload: VrAccountUpdate, db: Session = Depends(get_db)
) -> VrAccount:
    account = _get_account(db, account_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


@router.post("/vr-accounts/{account_id}/activate", response_model=VrAccountRead)
def activate_vr_account(
    account_id: uuid.UUID, db: Session = Depends(get_db)
) -> VrAccount:
    account = _get_account(db, account_id)
    # Clear every active flag first so the single-active index never conflicts.
    db.execute(update(VrAccount).values(is_active=False))
    db.flush()
    account.is_active = True
    db.commit()
    db.refresh(account)
    return account


@router.delete("/vr-accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vr_account(
    account_id: uuid.UUID, db: Session = Depends(get_db)
) -> Response:
    account = _get_account(db, account_id)
    if account.is_active:
        raise HTTPException(
            400, "cannot delete the active VR account; activate another account first"
        )
    db.delete(account)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
