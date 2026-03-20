
package ru.funkids.notificationservice.util;

public class PhoneUtil {


    public static String toMsisdnRu(String raw) {
        if (raw == null) return null;
        String d = raw.replaceAll("\\D+", "");
        if (d.startsWith("8") && d.length() == 11) {
            return "7" + d.substring(1);
        }
        if (d.startsWith("9") && d.length() == 10) {
            return "7" + d;
        }
        if (d.startsWith("7") && d.length() == 11) {
            return d;
        }
        return d;
    }
}
