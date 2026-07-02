package net.mocomo.app;

import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** 유료 미디어 열람 중 스크린샷·화면 녹화 차단 (Android FLAG_SECURE) */
@CapacitorPlugin(name = "ScreenSecure")
public class ScreenSecurePlugin extends Plugin {

  @PluginMethod
  public void enable(PluginCall call) {
    getActivity()
        .runOnUiThread(
            () -> {
              getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
              call.resolve();
            });
  }

  @PluginMethod
  public void disable(PluginCall call) {
    getActivity()
        .runOnUiThread(
            () -> {
              getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
              call.resolve();
            });
  }
}
