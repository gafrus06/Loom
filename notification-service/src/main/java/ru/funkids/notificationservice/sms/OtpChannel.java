package ru.funkids.notificationservice.sms;

public interface OtpChannel {
    void sendCode(String phone, String code);
}
