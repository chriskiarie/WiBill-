"""
backend/app/jobs/invoice_scheduler.py
Scheduled jobs for invoice system

Three automated jobs:
1. Create invoices (26th 00:00) - Monthly
2. Send reminders (26th 09:00) - Monthly
3. Check overdue (Daily 06:00) - Daily
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone
from sqlalchemy import select, and_
import logging

from app.core.database import AsyncSessionLocal
from app.models.invoice import Invoice, InvoiceStatus
from app.models.tenant import Tenant
from app.services.invoice_service import (
    create_monthly_invoice,
    send_invoice_reminder,
    check_overdue_invoices,
)

logger = logging.getLogger(__name__)


# ============================================================================
# SETUP SCHEDULER
# ============================================================================

scheduler = AsyncIOScheduler()


def start_scheduler():
    """Start the scheduler with all jobs"""
    
    # Job 1: Create invoices on 26th
    scheduler.add_job(
        create_invoices_job,
        'cron',
        day=26,
        hour=0,
        minute=0,
        id='create_monthly_invoices',
        name='Create Monthly Invoices',
        misfire_grace_time=3600,  # Grace period of 1 hour
    )
    logger.info("✅ Scheduled: Create invoices (26th 00:00)")
    
    # Job 2: Send reminders on 26th
    scheduler.add_job(
        send_reminders_job,
        'cron',
        day=26,
        hour=9,
        minute=0,
        id='send_invoice_reminders',
        name='Send Invoice Reminders',
        misfire_grace_time=3600,
    )
    logger.info("✅ Scheduled: Send reminders (26th 09:00)")
    
    # Job 3: Check overdue daily
    scheduler.add_job(
        check_overdue_job,
        'cron',
        hour=6,
        minute=0,
        id='check_overdue_invoices',
        name='Check Overdue Invoices',
        misfire_grace_time=3600,
    )
    logger.info("✅ Scheduled: Check overdue (Daily 06:00)")
    
    scheduler.start()
    logger.info("🚀 Invoice scheduler started")


# ============================================================================
# JOB 1: CREATE MONTHLY INVOICES (26th 00:00)
# ============================================================================

async def create_invoices_job():
    """
    Create invoices for all ISPs
    
    Called: 26th of each month at 00:00
    
    Steps:
    1. Get list of all active ISPs
    2. For each ISP, create invoice for current month
    3. Gather transactions from that ISP
    4. Calculate totals
    5. Save to database
    
    This is the most critical job - it triggers the billing cycle.
    """
    
    logger.info("🏗️ Starting: Create monthly invoices")
    
    async with AsyncSessionLocal() as db:
        try:
            # Get all active tenants
            result = await db.execute(
                select(Tenant).where(Tenant.is_active == True)
            )
            tenants = result.scalars().all()
            
            logger.info(f"Creating invoices for {len(tenants)} ISPs")
            
            # Create invoice for each ISP
            created_count = 0
            failed_count = 0
            
            now = datetime.now(timezone.utc)
            month = now.month
            year = now.year
            
            for tenant in tenants:
                try:
                    invoice = await create_monthly_invoice(
                        tenant_id=tenant.id,
                        month=month,
                        year=year,
                        db=db
                    )
                    created_count += 1
                    logger.info(f"✅ Invoice created: {tenant.name} - {invoice.invoice_number}")
                    
                except Exception as e:
                    failed_count += 1
                    logger.error(f"❌ Failed to create invoice for {tenant.name}: {str(e)}")
                    continue
            
            logger.info(f"📊 Created {created_count} invoices, {failed_count} failed")
            
        except Exception as e:
            logger.error(f"❌ Job failed: create_invoices_job - {str(e)}")


# ============================================================================
# JOB 2: SEND INVOICE REMINDERS (26th 09:00)
# ============================================================================

async def send_reminders_job():
    """
    Send invoice reminder emails (2 days before due)
    
    Called: 26th of each month at 09:00 (9 AM)
    
    Steps:
    1. Get all invoices created today
    2. For each invoice, send reminder email
    3. Record that email was sent
    4. Mark email status as sent
    
    Emails sent on the day invoice is created are technically 2 days before due.
    """
    
    logger.info("📧 Starting: Send invoice reminders")
    
    async with AsyncSessionLocal() as db:
        try:
            # Get invoices issued today
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            result = await db.execute(
                select(Invoice).where(
                    and_(
                        Invoice.issued_date >= today_start,
                        Invoice.issued_date <= today_end,
                        Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.DUE])
                    )
                )
            )
            invoices = result.scalars().all()
            
            logger.info(f"Sending reminders for {len(invoices)} invoices")
            
            sent_count = 0
            failed_count = 0
            
            for invoice in invoices:
                try:
                    await send_invoice_reminder(invoice.id, db)
                    sent_count += 1
                    logger.info(f"✅ Reminder sent: {invoice.invoice_number} to {invoice.tenant.email}")
                    
                except Exception as e:
                    failed_count += 1
                    logger.error(f"❌ Failed to send reminder for {invoice.invoice_number}: {str(e)}")
                    continue
            
            logger.info(f"📊 Sent {sent_count} reminders, {failed_count} failed")
            
        except Exception as e:
            logger.error(f"❌ Job failed: send_reminders_job - {str(e)}")


# ============================================================================
# JOB 3: CHECK OVERDUE INVOICES (Daily 06:00)
# ============================================================================

async def check_overdue_job():
    """
    Check for overdue invoices and lock accounts
    
    Called: Daily at 06:00 (6 AM)
    
    Steps:
    1. Find all unpaid invoices past due date
    2. Mark them as OVERDUE
    3. Lock the ISP account
    4. Terminate all active sessions
    5. Deactivate portal
    6. Send alert email
    
    This is the enforcement mechanism - ensures payment by locking accounts.
    """
    
    logger.info("🔐 Starting: Check overdue invoices")
    
    async with AsyncSessionLocal() as db:
        try:
            result = await check_overdue_invoices(db)
            
            logger.info(
                f"📊 Overdue check complete: "
                f"{result['checked']} checked, "
                f"{result['locked']} locked, "
                f"{result['terminated_sessions']} sessions terminated"
            )
            
            if result['locked'] > 0:
                logger.warning(f"⚠️ {result['locked']} ISP accounts locked for overdue payment")
            
        except Exception as e:
            logger.error(f"❌ Job failed: check_overdue_job - {str(e)}")


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_next_job_run(job_id: str) -> datetime:
    """Get next scheduled run time for a job"""
    job = scheduler.get_job(job_id)
    if job:
        return job.next_run_time
    return None


def get_job_status() -> dict:
    """Get status of all jobs"""
    return {
        "create_invoices": {
            "next_run": str(get_next_job_run('create_monthly_invoices')),
            "schedule": "26th of month at 00:00",
        },
        "send_reminders": {
            "next_run": str(get_next_job_run('send_invoice_reminders')),
            "schedule": "26th of month at 09:00",
        },
        "check_overdue": {
            "next_run": str(get_next_job_run('check_overdue_invoices')),
            "schedule": "Daily at 06:00",
        },
    }


# ============================================================================
# MANUAL TRIGGER FUNCTIONS (For testing/admin)
# ============================================================================

async def trigger_create_invoices():
    """Manually trigger invoice creation"""
    logger.info("🔵 Manual trigger: Create invoices")
    await create_invoices_job()


async def trigger_send_reminders():
    """Manually trigger reminder sending"""
    logger.info("🔵 Manual trigger: Send reminders")
    await send_reminders_job()


async def trigger_check_overdue():
    """Manually trigger overdue check"""
    logger.info("🔵 Manual trigger: Check overdue")
    await check_overdue_job()