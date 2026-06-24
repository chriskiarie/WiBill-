"""
Send emails via SMTP using the stored SmtpConfig.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.crypto_service import decrypt
from app.models.smtp_config import SmtpConfig

log = logging.getLogger("honestbill.email")


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
    db: AsyncSession | None = None,
) -> bool:
    """
    Send an email using the platform SMTP config.
    Requires db session to load config. Returns True on success.
    """
    if not db:
        log.warning("No db session provided, cannot send email")
        return False

    stmt = select(SmtpConfig).limit(1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config or not config.is_configured or not config.host:
        log.warning("SMTP not configured — email not sent")
        return False

    try:
        password = decrypt(config.password_enc) if config.password_enc else ""
    except Exception:
        log.error("Failed to decrypt SMTP password")
        password = ""

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{config.from_name or 'HonestBill'} <{config.from_email}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    if html_body:
        msg.attach(MIMEText(html_body, "html"))

    try:
        if config.use_tls:
            server = smtplib.SMTP(config.host, config.port, timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()
        else:
            server = smtplib.SMTP(config.host, config.port, timeout=15)

        if config.username and password:
            server.login(config.username, password)

        server.sendmail(config.from_email, [to_email], msg.as_string())
        server.quit()
        log.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        log.error(f"Failed to send email to {to_email}: {e}")
        return False
