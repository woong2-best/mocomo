/**
 * @react-native-ml-kit/translate-text@0.5.0 Android:
 * - reads requireWifi under the wrong key (`requiresWifi`), so Wi-Fi download limits never apply
 * - Translation.getClient() is one shared Translator per language pair, then close() after every
 *   call. Overlapping JS translations unload the model mid-flight and the next string reloads it.
 *
 * Keep one open translator per pair, download once, and run that pair on a single thread.
 */
const fs = require("fs");
const path = require("path");

const TARGET = path.join(
  __dirname,
  "..",
  "node_modules/@react-native-ml-kit/translate-text/android/src/main/java/com/rnmlkit/translatetext/TranslateTextModule.java"
);

const MARKER = "mocomo-translator-reuse";

const NEXT = `package com.rnmlkit.translatetext;

import android.os.Build;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.common.model.DownloadConditions;
import com.google.mlkit.nl.translate.TranslateLanguage;
import com.google.mlkit.nl.translate.Translation;
import com.google.mlkit.nl.translate.Translator;
import com.google.mlkit.nl.translate.TranslatorOptions;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * mocomo-translator-reuse
 * One open Translator per language pair. Do not close it after each string.
 */
public class TranslateTextModule extends ReactContextBaseJavaModule {

    private final Map<String, Translator> translators = new ConcurrentHashMap<>();
    private final Map<String, ExecutorService> executors = new ConcurrentHashMap<>();
    private final Map<String, Boolean> modelsReady = new ConcurrentHashMap<>();
    private volatile boolean closed = false;

    public TranslateTextModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "TranslateText";
    }

    @Override
    public void invalidate() {
        closed = true;
        for (Translator translator : translators.values()) {
            try {
                translator.close();
            } catch (Exception ignored) {
            }
        }
        translators.clear();
        modelsReady.clear();
        for (ExecutorService executor : executors.values()) {
            executor.shutdown();
        }
        executors.clear();
        super.invalidate();
    }

    private ExecutorService executorFor(String key) {
        ExecutorService existing = executors.get(key);
        if (existing != null) return existing;
        ExecutorService created = Executors.newSingleThreadExecutor();
        ExecutorService raced = executors.putIfAbsent(key, created);
        if (raced != null) {
            created.shutdown();
            return raced;
        }
        return created;
    }

    @ReactMethod
    public void translate(final ReadableMap optionsMap, final Promise promise) {
        if (closed) {
            promise.reject("TEXT_TRANSLATE_FAILED", "Translator module is closed");
            return;
        }
        final String text = optionsMap.getString("text");
        if (text == null) {
            promise.reject("TEXT_TRANSLATE_FAILED", "Text cannot be null");
            return;
        }
        String sourceLanguage = optionsMap.getString("sourceLanguage");
        String targetLanguage = optionsMap.getString("targetLanguage");
        if (sourceLanguage != null) {
            sourceLanguage = TranslateLanguage.fromLanguageTag(sourceLanguage);
        }
        if (targetLanguage != null) {
            targetLanguage = TranslateLanguage.fromLanguageTag(targetLanguage);
        }
        if (sourceLanguage == null) {
            promise.reject("TEXT_TRANSLATE_FAILED", "Source language cannot be null");
            return;
        }
        if (targetLanguage == null) {
            promise.reject("TEXT_TRANSLATE_FAILED", "Target language cannot be null");
            return;
        }

        final String source = sourceLanguage;
        final String target = targetLanguage;
        final String key = source + ">" + target;
        final boolean download = optionsMap.hasKey("downloadModelIfNeeded")
                && optionsMap.getBoolean("downloadModelIfNeeded");
        final boolean requireWifi = optionsMap.hasKey("requireWifi")
                && optionsMap.getBoolean("requireWifi");
        final boolean requireCharging = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
                && optionsMap.hasKey("requireCharging")
                && optionsMap.getBoolean("requireCharging");

        final TranslatorOptions options = new TranslatorOptions.Builder()
                .setSourceLanguage(source)
                .setTargetLanguage(target)
                .build();
        final Translator translator = translators.computeIfAbsent(key, ignored -> Translation.getClient(options));

        executorFor(key).execute(() -> {
            if (closed) {
                promise.reject("TEXT_TRANSLATE_FAILED", "Translator module is closed");
                return;
            }
            try {
                if (download && !Boolean.TRUE.equals(modelsReady.get(key))) {
                    DownloadConditions.Builder conditions = new DownloadConditions.Builder();
                    if (requireWifi) {
                        conditions.requireWifi();
                    }
                    if (requireCharging) {
                        conditions.requireCharging();
                    }
                    Tasks.await(translator.downloadModelIfNeeded(conditions.build()));
                    modelsReady.put(key, Boolean.TRUE);
                }
                promise.resolve(Tasks.await(translator.translate(text)));
            } catch (Exception e) {
                promise.reject("TEXT_TRANSLATE_FAILED", e.getMessage(), e);
            }
        });
    }
}
`;

if (!fs.existsSync(TARGET)) {
  console.warn("[patch-ml-kit-translate-wifi] skip - @react-native-ml-kit/translate-text not installed");
  process.exit(0);
}

const src = fs.readFileSync(TARGET, "utf8");
if (src.includes(MARKER) && src.includes('optionsMap.hasKey("requireWifi")')) {
  process.exit(0);
}

fs.writeFileSync(TARGET, NEXT, "utf8");
console.log("[patch-ml-kit-translate-wifi] patched translator reuse + requireWifi");
