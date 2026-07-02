package net.mocomo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(ScreenSecurePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
