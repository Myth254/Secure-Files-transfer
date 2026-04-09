"""
Focused regression tests for OTP lifecycle edge cases.
"""
from src.models.file import File
from src.models.otp import OTPCode
from src.services.email_service import EmailService
from src.services.otp_service import OTPService


def _stub_email_sender(monkeypatch):
    monkeypatch.setattr(
        EmailService,
        'send_otp_email',
        classmethod(lambda cls, **kwargs: True),
    )


class TestOTPServiceReuse:
    def test_send_otp_reuses_same_scope_only(self, test_db, test_user, test_file, monkeypatch):
        _stub_email_sender(monkeypatch)

        other_file = File(
            owner_id=test_user.id,
            filename='other.txt',
            original_size=64,
            encrypted_file=b'other encrypted content',
            encrypted_aes_key='other_encrypted_aes_key_hex',
        )
        test_db.session.add(other_file)
        test_db.session.commit()

        first = OTPService.send_otp(
            user_id=test_user.id,
            email=test_user.email,
            purpose='file_download',
            username=test_user.username,
            file_id=test_file.id,
        )
        second_same_scope = OTPService.send_otp(
            user_id=test_user.id,
            email=test_user.email,
            purpose='file_download',
            username=test_user.username,
            file_id=test_file.id,
        )
        third_other_scope = OTPService.send_otp(
            user_id=test_user.id,
            email=test_user.email,
            purpose='file_download',
            username=test_user.username,
            file_id=other_file.id,
        )

        assert first['success'] is True
        assert second_same_scope['otp_id'] == first['otp_id']
        assert third_other_scope['otp_id'] != first['otp_id']

    def test_send_otp_replaces_exhausted_active_code(self, test_db, test_user, test_file, monkeypatch):
        _stub_email_sender(monkeypatch)

        first = OTPService.send_otp(
            user_id=test_user.id,
            email=test_user.email,
            purpose='file_download',
            username=test_user.username,
            file_id=test_file.id,
        )

        active_otp = test_db.session.get(OTPCode, first['otp_id'])
        active_otp.attempts = OTPService._config_int('OTP_MAX_ATTEMPTS', OTPService.MAX_ATTEMPTS)
        test_db.session.commit()

        replacement = OTPService.send_otp(
            user_id=test_user.id,
            email=test_user.email,
            purpose='file_download',
            username=test_user.username,
            file_id=test_file.id,
        )

        assert replacement['success'] is True
        assert replacement['otp_id'] != first['otp_id']
