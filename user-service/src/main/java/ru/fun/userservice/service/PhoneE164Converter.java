package ru.fun.userservice.service;

import com.google.i18n.phonenumbers.PhoneNumberUtil;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.regex.Pattern;


@Converter(autoApply = false)
public class PhoneE164Converter implements AttributeConverter<String, String> {
    private static final PhoneNumberUtil util = PhoneNumberUtil.getInstance();
    private static final Pattern E164 = Pattern.compile("^\\+[1-9]\\d{1,14}$");

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isBlank()) return null;
        String raw = attribute.trim();
        if (!E164.matcher(raw).matches()) throw new IllegalArgumentException("Phone must be E.164");
        try {
            var num = util.parse(raw, "RU");
            if (!util.isValidNumber(num)) throw new IllegalArgumentException("Invalid phone number");
            return util.format(num, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid phone number", e);
        }
    }
    @Override public String convertToEntityAttribute(String dbData) { return dbData; }
}

