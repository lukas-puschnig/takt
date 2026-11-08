package io.github.lukaspuschnig.takt;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;

/** JS-Brücke zu {@link NotificationCleanup}. */
@CapacitorPlugin(name = "TaktCleanup")
public class NotificationCleanupPlugin extends Plugin {

    /** { key: string, at: number[] } – Zeitpunkte, nach denen aufgeräumt werden soll. */
    @PluginMethod
    public void plan(PluginCall call) {
        String key = call.getString("key");
        JSArray at = call.getArray("at");
        if (key == null || at == null) {
            call.reject("key und at fehlen");
            return;
        }
        List<Long> times = new ArrayList<>();
        try {
            for (int i = 0; i < at.length(); i++) times.add(at.getLong(i));
        } catch (JSONException e) {
            call.reject("at muss aus Zahlen bestehen", e);
            return;
        }
        NotificationCleanup.store(getContext(), key, times);
        NotificationCleanup.scheduleNext(getContext());
        call.resolve();
    }

    /** Sofort aufräumen (z. B. beim Öffnen der App). */
    @PluginMethod
    public void cleanup(PluginCall call) {
        NotificationCleanup.dedupe(getContext());
        call.resolve();
    }
}
