"""
Daily job: checks for subscribers past their billing date.
Auto-sends STK push if M-Pesa configured, or marks as suspended.
Runs once daily at 06:00 (via APScheduler cron trigger).
"""
import logging
from datetime import datetime
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.subscriber import Subscriber
from app.models.subscriber_plan import SubscriberPlan
from app.models.tenant import Tenant
from app.models.mpesa_config import MpesaConfig
from app.services.mikrotik_service import pause_subscriber_traffic
from app.services.daraja_service import initiate_stk_push
from app.services.crypto_service import decrypt
from app.services.subscriber_service import (
    get_overdue_subscribers,
    suspend_subscriber,
    resume_subscriber,
)
from app.core.config import settings

logger = logging.getLogger("honestbill.subscriber_expiry")


async def process_overdue_subscribers():
    """Find overdue subscribers, auto-send STK push, suspend if failed."""
    logger.info("=== Subscriber expiry check: starting ===")
    async with AsyncSessionLocal() as db:
        overdue = await get_overdue_subscribers(db=db)
        logger.info(f"Found {len(overdue)} overdue subscriber(s)")

        for subscriber in overdue:
            try:
                # Skip if already suspended or paused
                if subscriber.status in ("suspended", "paused", "pending_suspension"):
                    continue

                # Get tenant and check if M-Pesa is configured
                tenant_result = await db.execute(
                    select(Tenant).where(Tenant.id == subscriber.tenant_id)
                )
                tenant = tenant_result.scalar_one_or_none()
                if not tenant:
                    continue

                # Try auto STK push
                mpesa_result = await db.execute(
                    select(MpesaConfig).where(
                        MpesaConfig.tenant_id == subscriber.tenant_id,
                        MpesaConfig.is_active == True,
                    )
                )
                mpesa_cfg = mpesa_result.scalar_one_or_none()

                if mpesa_cfg and mpesa_cfg.is_verified:
                    # Get plan amount
                    plan_amount = subscriber.amount_due_ksh
                    if subscriber.plan_id:
                        plan_result = await db.execute(
                            select(SubscriberPlan).where(SubscriberPlan.id == subscriber.plan_id)
                        )
                        plan = plan_result.scalar_one_or_none()
                        if plan:
                            plan_amount = float(plan.price_ksh)

                    if plan_amount > 0:
                        try:
                            stk_result = await initiate_stk_push(
                                consumer_key_enc=mpesa_cfg.consumer_key_enc,
                                consumer_secret_enc=mpesa_cfg.consumer_secret_enc,
                                shortcode=mpesa_cfg.shortcode,
                                passkey_enc=mpesa_cfg.passkey_enc,
                                phone_number=subscriber.phone_number,
                                amount=Decimal(str(plan_amount)),
                                account_reference=subscriber.account_number[:12],
                                description=f"Monthly {subscriber.account_number}",
                                callback_url=settings.MPESA_CALLBACK_URL,
                            )
                            if stk_result.get("ResponseCode") == "0":
                                logger.info(
                                    f"Auto STK sent to {subscriber.phone_number} "
                                    f"for {subscriber.account_number}"
                                )
                                continue
                        except Exception as e:
                            logger.warning(f"Auto STK failed for {subscriber.account_number}: {e}")

                # If STK failed or not configured, suspend
                subscriber.status = "pending_suspension"
                subscriber.amount_due_ksh = subscriber.amount_due_ksh or (
                    float(plan.price_ksh) if subscriber.plan_id else 0
                )
                await db.flush()

                # Send block command to bridge
                try:
                    await pause_subscriber_traffic(
                        tenant_id=str(subscriber.tenant_id),
                        subscriber_id=str(subscriber.id),
                        ip_address=subscriber.networking_ip,
                        db=db,
                    )
                except Exception as e:
                    logger.error(f"Bridge block failed for {subscriber.account_number}: {e}")

                subscriber.status = "suspended"
                await db.flush()

                # Log status change
                from app.models.subscriber_status_log import SubscriberStatusLog
                log = SubscriberStatusLog(
                    id=__import__("uuid").uuid4(),
                    subscriber_id=subscriber.id,
                    from_status="active",
                    to_status="suspended",
                    reason="Payment overdue — auto-suspended",
                    triggered_by="system",
                )
                db.add(log)
                logger.info(f"Subscriber {subscriber.account_number} suspended for non-payment")

            except Exception as e:
                logger.error(f"Error processing subscriber {subscriber.id}: {e}")
                continue

        await db.commit()
        logger.info(f"=== Subscriber expiry check: processed {len(overdue)} ===")
