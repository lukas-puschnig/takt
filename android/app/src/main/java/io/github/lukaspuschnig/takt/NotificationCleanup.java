package io.github.lukaspuschnig.takt;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.service.notification.StatusBarNotification;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Wiederholte Erinnerungen (gleiche Gruppe „takt:…“) sollen sich ersetzen statt stapeln.
 * Das Notification-Plugin kann pro ID nur einen Alarm planen, jede Wiederholung hat also
 * eine eigene ID. Dieser Receiver läuft kurz nach jeder geplanten Meldung und lässt je
 * Gruppe nur die neueste stehen.
 */
public class NotificationCleanup extends BroadcastReceiver {

    private static final String PREFS = "takt-cleanup";
    private static final String GROUP_PREFIX = "takt:";
    /** Abstand nach der geplanten Meldung, damit sie sicher schon angezeigt wird. */
    private static final long DELAY_MS = 2000;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) dedupe(context);
        scheduleNext(context);
    }

    /** Zeitpunkte (ms) der geplanten Meldungen einer Quelle, z. B. "reminders" oder "timer". */
    static void store(Context context, String key, List<Long> times) {
        StringBuilder sb = new StringBuilder();
        for (Long t : times) {
            if (sb.length() > 0) sb.append(',');
            sb.append(t);
        }
        prefs(context).edit().putString(key, sb.toString()).apply();
    }

    /** Je Gruppe nur die zuletzt angezeigte Meldung behalten. */
    static void dedupe(Context context) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        Map<String, StatusBarNotification> newest = new HashMap<>();
        for (StatusBarNotification sbn : nm.getActiveNotifications()) {
            String group = sbn.getNotification().getGroup();
            if (group == null || !group.startsWith(GROUP_PREFIX)) continue;
            StatusBarNotification keep = newest.get(group);
            if (keep == null) {
                newest.put(group, sbn);
                continue;
            }
            StatusBarNotification drop = sbn.getPostTime() > keep.getPostTime() ? keep : sbn;
            if (drop == keep) newest.put(group, sbn);
            nm.cancel(drop.getTag(), drop.getId());
        }
    }

    /** Alarm auf die nächste geplante Meldung (+ DELAY_MS) stellen. */
    static void scheduleNext(Context context) {
        long now = System.currentTimeMillis();
        long next = Long.MAX_VALUE;
        for (Object value : prefs(context).getAll().values()) {
            if (!(value instanceof String)) continue;
            for (String s : ((String) value).split(",")) {
                if (s.isEmpty()) continue;
                try {
                    long t = Long.parseLong(s) + DELAY_MS;
                    if (t > now && t < next) next = t;
                } catch (NumberFormatException ignored) {
                    // kaputter Eintrag
                }
            }
        }

        AlarmManager am = context.getSystemService(AlarmManager.class);
        if (am == null) return;
        Intent intent = new Intent(context, NotificationCleanup.class);
        PendingIntent pi = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        if (next == Long.MAX_VALUE) {
            am.cancel(pi);
            return;
        }
        // Kein Wecken und kein allowWhileIdle: Das Aufräumen darf warten, bis das Handy
        // wach ist, und soll den Erinnerungen keine Idle-Alarme wegnehmen.
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
        if (exact) am.setExact(AlarmManager.RTC, next, pi);
        else am.set(AlarmManager.RTC, next, pi);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
